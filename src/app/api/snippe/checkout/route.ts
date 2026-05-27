import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initiateCollection, PLATFORM_FEE_RATE } from "@/lib/snippe";
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
      include: { tiers: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    let ticketPrice: number;
    let tierName = "";

    if (tierId) {
      const tier = event.tiers.find(t => t.id === tierId);
      if (!tier) return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
      if (tier.capacity != null) {
        const sold = await prisma.guest.count({
          where: { eventId, tierId, status: { in: ["CONFIRMED", "PENDING"] } },
        });
        if (sold >= tier.capacity) {
          return NextResponse.json({ error: `${tier.name} tickets are sold out` }, { status: 409 });
        }
      }
      ticketPrice = tier.price;
      tierName = tier.name;
    } else {
      if (!event.ticketPrice) return NextResponse.json({ error: "Not a paid event" }, { status: 400 });
      ticketPrice = event.ticketPrice;
    }

    if (event.maxGuests) {
      const count = await prisma.guest.count({ where: { eventId, status: "CONFIRMED" } });
      if (count >= event.maxGuests) return NextResponse.json({ error: "Event is at capacity" }, { status: 409 });
    }

    const email = guestEmail || null;
    const existing = email
      ? await prisma.guest.findFirst({ where: { eventId, email } })
      : null;

    let guest;
    if (existing) {
      guest = existing;
    } else {
      guest = await prisma.guest.create({
        data: {
          name: guestName,
          email,
          phone: guestPhone,
          plusOne,
          eventId,
          dietaryReqs: dietaryReqs || null,
          message: message || null,
          status: "PENDING",
          ...(tierId && { tierId }),
        },
      });
    }

    const platformFee = Math.round(ticketPrice * PLATFORM_FEE_RATE);
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
    console.error("Snippe checkout error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment initiation failed" }, { status: 500 });
  }
}
