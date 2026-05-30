import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

function nextDate(base: Date, recurrenceType: string): Date {
  const d = new Date(base);
  if (recurrenceType === "WEEKLY") d.setDate(d.getDate() + 7);
  else if (recurrenceType === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (recurrenceType === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const source = await prisma.event.findFirst({
      where: { id, hostId: user.userId },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (source.recurrenceType === "NONE") {
      return NextResponse.json({ error: "This event is not set to recur" }, { status: 400 });
    }

    const newDate = nextDate(source.date, source.recurrenceType);
    const newEnd = source.endDate ? nextDate(source.endDate, source.recurrenceType) : null;

    if (source.recurrenceEnd && newDate > source.recurrenceEnd) {
      return NextResponse.json({ error: "Next occurrence would be past the recurrence end date" }, { status: 409 });
    }

    const occurrence = await prisma.event.create({
      data: {
        title: source.title,
        description: source.description,
        date: newDate,
        endDate: newEnd,
        location: source.location,
        address: source.address,
        coverImage: source.coverImage,
        coverColor: source.coverColor,
        category: source.category,
        maxGuests: source.maxGuests,
        ticketPrice: source.ticketPrice,
        ticketCurrency: source.ticketCurrency,
        inviteText: source.inviteText,
        dressCode: source.dressCode,
        notes: source.notes,
        isPublic: source.isPublic,
        recurrenceType: source.recurrenceType,
        recurrenceEnd: source.recurrenceEnd,
        parentEventId: source.parentEventId ?? id,
        status: "DRAFT",
        hostId: user.userId,
        ...(source.tiers.length > 0 && {
          tiers: {
            create: source.tiers.map(t => ({
              name: t.name,
              description: t.description,
              price: t.price,
              capacity: t.capacity,
              sortOrder: t.sortOrder,
            })),
          },
        }),
      },
    });

    return NextResponse.json({ data: occurrence }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events/[id]/recur error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
