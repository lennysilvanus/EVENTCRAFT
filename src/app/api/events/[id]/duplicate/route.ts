import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const source = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!source) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const copy = await prisma.event.create({
      data: {
        title: `${source.title} (Copy)`,
        description: source.description,
        date: source.date,
        endDate: source.endDate,
        location: source.location,
        address: source.address,
        coverImage: source.coverImage,
        coverColor: source.coverColor,
        category: source.category,
        maxGuests: source.maxGuests,
        ticketPrice: source.ticketPrice,
        ticketCurrency: source.ticketCurrency,
        rsvpDeadline: source.rsvpDeadline,
        inviteText: source.inviteText,
        dressCode: source.dressCode,
        notes: source.notes,
        isPublic: source.isPublic,
        status: "DRAFT",
        hostId: user.userId,
      },
    });

    return NextResponse.json({ data: copy }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
