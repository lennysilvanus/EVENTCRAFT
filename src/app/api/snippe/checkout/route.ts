import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { initiateCollection } from "@/lib/snippe";
import { PLATFORM_FEE_RATES } from "@/lib/snippe-constants";
import { getEffectivePlan } from "@/lib/plan-limits";
import { z } from "zod";

const schema = z.object({
  eventId: z.string(),
  tierId: z.string().optional(),
  guestName: z.string().min(1),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().min(9),
  payerPhone: z.string().min(9),
  network: z.string().min(1),
  plusOne: z.boolean().default(false),
  dietaryReqs: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { eventId, tierId, guestName, guestEmail, guestPhone, payerPhone, network, plusOne, dietaryReqs, message } = parsed.data;

    const event = await prisma.event.findFirst({
      where: { id: eventId, status: "PUBLISHED" },
      include: {
        tiers: true,
        host: { select: { plan: true, planExpiresAt: true, role: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Resolve price outside the transaction (read-only, fine to do early)
    let ticketPrice: number;
    let tierName = "";

    if (tierId) {
      const tier = event.tiers.find(t => t.id === tierId);
      if (!tier) return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
      ticketPrice = tier.price;
      tierName = tier.name;
    } else {
      if (!event.ticketPrice) return NextResponse.json({ error: "Not a paid event" }, { status: 400 });
      ticketPrice = event.ticketPrice;
    }

    // ── Serialised capacity check + guest upsert ───────────────────────────
    // RepeatableRead prevents two concurrent checkouts from both seeing
    // "1 seat left" and both succeeding — one will retry or see sold-out.
    const email = guestEmail || null;

    const guest = await prisma.$transaction(async (tx) => {
      // Check tier capacity
      if (tierId) {
        // Re-fetch tier inside the transaction to avoid stale pre-transaction snapshot (M-5)
        const tier = await tx.ticketTier.findUnique({ where: { id: tierId } });
        if (!tier || tier.eventId !== eventId) {
          throw Object.assign(new Error("Ticket tier not found"), { code: "NOT_FOUND", status: 404 });
        }
        if (tier.capacity != null) {
          const sold = await tx.guest.count({
            where: { eventId, tierId, status: { in: ["CONFIRMED", "PENDING"] } },
          });
          if (sold >= tier.capacity) {
            throw Object.assign(new Error(`${tier.name} tickets are sold out`), { code: "SOLD_OUT", status: 409 });
          }
        }
      } else if (tierId === undefined && event.tiers.length > 0) {
        // Event has tiers but none was selected — guard against bypass
        throw Object.assign(new Error("Please select a ticket tier"), { code: "TIER_REQUIRED", status: 400 });
      }

      // Check overall event capacity
      if (event.maxGuests) {
        const count = await tx.guest.count({ where: { eventId, status: "CONFIRMED" } });
        if (count >= event.maxGuests) {
          throw Object.assign(new Error("Event is at capacity"), { code: "AT_CAPACITY", status: 409 });
        }
      }

      // Reuse existing guest record (same email + event) or create new
      const existing = email
        ? await tx.guest.findFirst({ where: { eventId, email } })
        : null;

      if (existing) return existing;

      return tx.guest.create({
        data: {
          name: guestName, email, phone: guestPhone,
          plusOne, eventId,
          dietaryReqs: dietaryReqs || null,
          message:     message     || null,
          status: "PENDING",
          ...(tierId && { tierId }),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
      .catch((err: Error & { code?: string; status?: number }) => {
        if (err.code === "SOLD_OUT" || err.code === "AT_CAPACITY") {
          throw err; // re-throw to be caught by outer handler
        }
        throw err;
      });

    // Use effective plan (respects expiry) so an expired PRO host pays the correct 4% rate (M-2)
    // C-1: Guard against overwriting a completed payment with PENDING
    const existingPayment = await prisma.payment.findUnique({ where: { guestId: guest.id } });
    if (existingPayment?.status === "COMPLETED") {
      return NextResponse.json({ error: "This ticket has already been paid for." }, { status: 409 });
    }

    const hostPlan = getEffectivePlan(event.host.plan ?? "FREE", event.host.planExpiresAt, event.host.role);
    const feeRate = PLATFORM_FEE_RATES[hostPlan] ?? PLATFORM_FEE_RATES.FREE;
    const platformFee = Math.round(ticketPrice * feeRate);
    const description = tierName
      ? `${tierName} Ticket — ${event.title}`
      : `Ticket — ${event.title}`;

    const result = await initiateCollection({
      amount: ticketPrice,
      phone: payerPhone,
      network,
      description,
      reference: guest.id,
    });

    await prisma.payment.upsert({
      where: { guestId: guest.id },
      update: {
        snippeId: result.transactionId,
        status: "PENDING",
        amount: ticketPrice,
        currency: event.ticketCurrency,
        provider: "snippe",
        platformFee,
        payoutStatus: "PENDING",
      },
      create: {
        amount: ticketPrice,
        currency: event.ticketCurrency,
        status: "PENDING",
        provider: "snippe",
        snippeId: result.transactionId,
        platformFee,
        payoutStatus: "PENDING",
        guestId: guest.id,
        eventId,
      },
    });

    return NextResponse.json({
      data: {
        transactionId: result.transactionId,
        status: result.status,
        message: "Payment initiated. Please approve the USSD prompt on your phone.",
        qrToken: guest.qrToken,
      },
    });
  } catch (error) {
    const err = error as Error & { code?: string; status?: number };
    if (err.code === "SOLD_OUT" || err.code === "AT_CAPACITY" || err.code === "NOT_FOUND" || err.code === "TIER_REQUIRED") {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 400 });
    }
    console.error("Snippe checkout error:", error);
    return NextResponse.json({ error: err.message ?? "Payment initiation failed" }, { status: 500 });
  }
}
