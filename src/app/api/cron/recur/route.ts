import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRecurringEventCreated } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

function nextDate(base: Date, recurrenceType: string): Date {
  const d = new Date(base);
  if (recurrenceType === "WEEKLY") d.setDate(d.getDate() + 7);
  else if (recurrenceType === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (recurrenceType === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find recurring events that are upcoming within 7 days and have no next occurrence yet
    const candidates = await prisma.event.findMany({
      where: {
        recurrenceType: { not: "NONE" },
        isTemplate: false,
        status: { not: "CANCELLED" },
        date: { gte: now, lte: sevenDaysFromNow },
        recurrences: { none: {} },
      },
      include: {
        host: { select: { name: true, email: true } },
        tiers: { orderBy: { sortOrder: "asc" } },
      },
    });

    let created = 0;

    for (const source of candidates) {
      const newDate = nextDate(source.date, source.recurrenceType);

      // Skip if the series has ended
      if (source.recurrenceEnd && newDate > source.recurrenceEnd) continue;

      try {
        const occurrence = await prisma.event.create({
          data: {
            title: source.title,
            description: source.description,
            date: newDate,
            endDate: source.endDate ? nextDate(source.endDate, source.recurrenceType) : null,
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
            parentEventId: source.parentEventId ?? source.id,
            status: "DRAFT",
            hostId: source.hostId,
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

        sendRecurringEventCreated({
          to: source.host.email,
          hostName: source.host.name,
          seriesTitle: source.title,
          newEventId: occurrence.id,
          newEventDate: newDate,
        }).catch(() => {});

        created++;
      } catch (err) {
        console.error(`[Recur] Failed for event ${source.id}:`, err);
      }
    }

    console.log("[Cron/recur]", { created });
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error("[Cron/recur] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
