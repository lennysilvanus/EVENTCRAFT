import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, disburseMobileMoney, disburseBank } from "@/lib/snippe";
import { PLATFORM_FEE_RATES } from "@/lib/snippe-constants";
import { MIN_PLATFORM_FEE_TZS } from "@/lib/plan-limits";
import { withRetry } from "@/lib/retry";
import { sendRSVPConfirmation, sendHostNotification } from "@/lib/email";

export async function POST(request: Request) {
  // L-2: Hoist transactionId so the catch block can mark the record FAILED
  // even when the error carries no transactionId property.
  let transactionId = "";

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-snippe-signature") ?? "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { event: eventType, data } = payload;

    if (eventType !== "payment.completed") {
      return NextResponse.json({ received: true });
    }

    const { transaction_id, status, amount, reference } = data;
    transactionId = transaction_id ?? "";

    // Idempotency guard with status tracking.
    // PROCESSING: being handled right now — a concurrent duplicate returns early.
    // DONE:        already processed successfully — always safe to skip.
    // FAILED:      previous attempt errored — allow re-delivery to retry.
    let webhookRecord: { id: string } | null = null;
    try {
      webhookRecord = await prisma.processedWebhookEvent.create({
        data: { transactionId: transaction_id, status: "PROCESSING" },
      });
    } catch {
      const existing = await prisma.processedWebhookEvent.findUnique({
        where: { transactionId: transaction_id },
        select: { status: true },
      });
      if (!existing || existing.status === "DONE" || existing.status === "PROCESSING") {
        return NextResponse.json({ received: true });
      }
      // status === "FAILED" — re-process: reset to PROCESSING and continue
      webhookRecord = await prisma.processedWebhookEvent.update({
        where: { transactionId: transaction_id },
        data:  { status: "PROCESSING", errorMessage: null },
      });
    }

    const markDone = () =>
      prisma.processedWebhookEvent.update({
        where: { transactionId: transaction_id },
        data:  { status: "DONE" },
      }).catch(() => {});

    const markFailed = (msg: string) =>
      prisma.processedWebhookEvent.update({
        where: { transactionId: transaction_id },
        data:  { status: "FAILED", errorMessage: msg },
      }).catch(() => {});

    // Handle event credit purchases (reference starts with "credit_")
    if (typeof reference === "string" && reference.startsWith("credit_")) {
      const parts = reference.split("_"); // credit_{userId}_{ts}
      const userId = parts[1];
      if (status === "success" && userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { eventCredits: { increment: 1 } },
        }).catch(err => console.error("Event credit grant failed", err));
      }
      await markDone();
      return NextResponse.json({ received: true });
    }

    // Handle subscription payments (reference starts with "sub_")
    if (typeof reference === "string" && reference.startsWith("sub_")) {
      const parts = reference.split("_"); // sub_{userId}_{PLAN}_{INTERVAL}_{ts}
      const userId = parts[1];
      const plan = parts[2];
      const interval = parts[3] ?? "MONTHLY";
      if (status === "success" && userId && ["PRO", "BUSINESS"].includes(plan)) {
        const expiresAt = new Date();
        if (interval === "ANNUAL") {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setDate(expiresAt.getDate() + 30);
        }
        await prisma.user.update({
          where: { id: userId },
          data: { plan, planExpiresAt: expiresAt, planInterval: interval },
        }).catch(err => console.error("Plan upgrade failed", err));
      }
      await markDone();
      return NextResponse.json({ received: true });
    }

    if (status !== "success") {
      await prisma.payment.updateMany({
        where: { snippeId: transaction_id },
        data: { status: "FAILED" },
      });
      await markDone();
      return NextResponse.json({ received: true });
    }

    const payment = await prisma.payment.findFirst({
      where: { snippeId: transaction_id },
      include: {
        guest: true,
        event: {
          include: {
            host: {
              include: { payoutMethods: { where: { isDefault: true }, take: 1 } },
            },
          },
        },
      },
    });

    if (!payment) {
      const paymentByRef = await prisma.payment.findFirst({
        where: { guest: { id: reference } },
        include: {
          guest: true,
          event: {
            include: {
              host: {
                include: { payoutMethods: { where: { isDefault: true }, take: 1 } },
              },
            },
          },
        },
      });
      if (!paymentByRef) { await markDone(); return NextResponse.json({ received: true }); }
      const res = await processPayment(paymentByRef, transaction_id, amount);
      await markDone();
      return res;
    }

    const res = await processPayment(payment, transaction_id, amount);
    await markDone();
    return res;
  } catch (error) {
    console.error("Snippe webhook error:", error);
    // L-2: Mark the record FAILED using the hoisted transactionId (always available)
    if (transactionId) {
      await prisma.processedWebhookEvent.updateMany({
        where: { transactionId, status: "PROCESSING" },
        data:  { status: "FAILED", errorMessage: String(error) },
      }).catch(() => {});
    }
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function processPayment(payment: Awaited<ReturnType<typeof findPayment>>, transactionId: string, amount: number) {
  const { guest, event } = payment;

  // Mark payment completed, confirm guest
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED", snippeId: transactionId },
    }),
    prisma.guest.update({
      where: { id: guest.id },
      data: { status: "CONFIRMED" },
    }),
  ]);

  // Fire confirmation emails with retry — transient Resend errors no longer
  // silently drop the guest's confirmation
  if (guest.email) {
    withRetry(() => sendRSVPConfirmation({
      to: guest.email!,
      guestName: guest.name, eventTitle: event.title,
      eventDate: event.date, eventLocation: event.location,
      status: "CONFIRMED", qrToken: guest.qrToken, hostName: event.host.name,
    }), { label: "webhook-rsvp-confirmation", retries: 3 }).catch(() => {});
  }

  withRetry(() => sendHostNotification({
    to: event.host.email, hostName: event.host.name,
    guestName: guest.name, guestEmail: guest.email ?? null, guestPhone: guest.phone ?? null,
    eventTitle: event.title, status: "CONFIRMED", eventId: event.id,
  }), { label: "webhook-host-notification", retries: 3 }).catch(() => {});

  // Trigger payout with retry — transient Snippe errors are retried before
  // falling back to the payout cron
  withRetry(() => triggerHostPayout(payment, amount), {
    label: "webhook-payout", retries: 2, delayMs: 2000,
  }).catch(err => console.error("Payout failed for payment", payment.id, err));

  return NextResponse.json({ received: true });
}

async function triggerHostPayout(payment: Awaited<ReturnType<typeof findPayment>>, collectedAmount: number) {
  const payout = payment.event.host.payoutMethods[0];
  if (!payout) {
    console.warn(`Host ${payment.event.host.id} has no payout method — skipping disbursement`);
    return;
  }

  const hostPlan = (payment.event.host as { plan?: string }).plan ?? "FREE";
  const feeRate    = PLATFORM_FEE_RATES[hostPlan] ?? PLATFORM_FEE_RATES.FREE;
  const platformFee = Math.max(Math.round(collectedAmount * feeRate), MIN_PLATFORM_FEE_TZS);
  const hostAmount  = collectedAmount - platformFee;

  let result;
  if (payout.type === "mobile_money" && payout.phone && payout.network) {
    result = await disburseMobileMoney({
      amount: hostAmount,
      phone: payout.phone,
      network: payout.network,
      reference: `payout-${payment.id}`,
    });
  } else if (payout.type === "bank_transfer" && payout.accountNumber && payout.bankCode && payout.accountName) {
    result = await disburseBank({
      amount: hostAmount,
      accountNumber: payout.accountNumber,
      bankCode: payout.bankCode,
      accountName: payout.accountName,
      reference: `payout-${payment.id}`,
    });
  } else {
    console.warn(`Incomplete payout method for host ${payment.event.host.id}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      platformFee,
      payoutId: result.disbursementId,
      payoutStatus: "SENT",
    },
  });
}

// Type helper for the include shape
async function findPayment() {
  return prisma.payment.findFirstOrThrow({
    include: {
      guest: true,
      event: {
        include: {
          host: {
            select: {
              id: true, name: true, email: true, plan: true,
              payoutMethods: { where: { isDefault: true }, take: 1 },
            },
          },
        },
      },
    },
  });
}
