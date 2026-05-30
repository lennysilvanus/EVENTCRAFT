import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const guest = await prisma.guest.findFirst({
      where: { qrToken: token },
      include: {
        event: {
          select: {
            title: true, date: true, location: true, address: true,
            category: true, dressCode: true, hostId: true, coverImage: true, coverColor: true,
            host: { select: { name: true } },
          },
        },
        tier: { select: { name: true, description: true } },
      },
    });

    if (!guest) return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });

    return NextResponse.json({ data: guest });
  } catch (error) {
    console.error("GET checkin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const guest = await prisma.guest.findFirst({
      where: { qrToken: token },
      include: {
        event: {
          select: {
            title: true, date: true, location: true, coverImage: true, coverColor: true,
            ticketPrice: true,
          },
        },
        tier: { select: { price: true } },
        payment: { select: { status: true } },
      },
    });

    if (!guest) return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    if (guest.checkedIn) {
      return NextResponse.json({ error: "Guest already checked in", data: guest }, { status: 409 });
    }
    if (guest.status === "DECLINED") {
      return NextResponse.json({ error: "Guest declined this event" }, { status: 403 });
    }

    // Payment gate: if this is a paid ticket, payment must be COMPLETED before check-in
    const isPaidTicket =
      (guest.tier && guest.tier.price > 0) ||
      (!guest.tier && guest.event.ticketPrice && guest.event.ticketPrice > 0);

    if (isPaidTicket) {
      if (!guest.payment || guest.payment.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "Payment not completed — this ticket has not been paid for" },
          { status: 402 }
        );
      }
    }

    const updated = await prisma.guest.update({
      where: { id: guest.id },
      data: { checkedIn: true, checkedInAt: new Date(), status: "CONFIRMED" },
      include: { event: { select: { title: true, date: true, location: true, coverImage: true, coverColor: true } } },
    });

    return NextResponse.json({ data: updated, message: "Check-in successful!" });
  } catch (error) {
    console.error("POST checkin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
