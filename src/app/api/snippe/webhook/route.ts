import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, disburseMobileMoney, disburseBank, PLATFORM_FEE_RATE } from "@/lib/snippe";
import { sendRSVPConfirmation, sendHostNotification } from "@/lib/email";

export async function POST(request: Request) {
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

    // Idempotency — skip if already processed
    try {
      await prisma.processedWebhookEvent.create({ data: { transactionId: transaction_id } });
    } catch {
      return NextResponse.json({ received: true });
    }

    // Handle subscription payments (reference starts with "sub_")
    if (typeof reference === "string" && reference.startsWith("sub_")) {
      const parts = reference.split("_"); // sub_{userId}_{PLAN}_{ts}
      const userId = parts[1];
      const plan = parts[2];
      if (status === "success" && userId && ["PRO", "BUSINESS"].includes(plan)) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await prisma.user.update({
          where: { id: userId },
          data: { plan, planExpiresAt: expiresAt },
        }).catch(err => console.error("Plan upgrade failed", err));
      }
      return NextResponse.json({ received: true });
    }

    if (status !== "success") {
      await prisma.payment.updateMany({
        where: { snippeId: transaction_id },
        data: { status: "FAILED" },
      });
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
      // Try matching by guest reference (guestId)
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
      if (!paymentByRef) return NextResponse.json({ received: true });
      return await processPayment(paymentByRef, transaction_id, amount);
    }

    return await processPayment(payment, transaction_id, amount);
  } catch (error) {
    console.error("Snippe webhook error:", error);
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

  // Fire confirmation emails non-blocking
  if (guest.email) {
    sendRSVPConfirmation({
      to: guest.email,
      guestName: guest.name,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      status: "CONFIRMED",
      qrToken: guest.qrToken,
      hostName: event.host.name,
    }).catch(() => {});
  }

  sendHostNotification({
    to: event.host.email,
    hostName: event.host.name,
    guestName: guest.name,
    guestEmail: guest.email ?? null,
    guestPhone: guest.phone ?? null,
    eventTitle: event.title,
    status: "CONFIRMED",
    eventId: event.id,
  }).catch(() => {});

  // Trigger payout to host (non-blocking)
  triggerHostPayout(payment, amount).catch(err =>
    console.error("Payout failed for payment", payment.id, err)
  );

  return NextResponse.json({ received: true });
}

async function triggerHostPayout(payment: Awaited<ReturnType<typeof findPayment>>, collectedAmount: number) {
  const payout = payment.event.host.payoutMethods[0];
  if (!payout) {
    console.warn(`Host ${payment.event.host.id} has no payout method — skipping disbursement`);
    return;
  }

  const platformFee = Math.round(collectedAmount * PLATFORM_FEE_RATE);
  const hostAmount = collectedAmount - platformFee;

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
            include: { payoutMethods: { where: { isDefault: true }, take: 1 } },
          },
        },
      },
    },
  });
}
