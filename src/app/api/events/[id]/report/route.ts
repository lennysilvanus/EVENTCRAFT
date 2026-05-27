import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({
      where: { id, hostId: user.userId },
      include: {
        guests: { select: { status: true, checkedIn: true, checkedInAt: true, dietaryReqs: true, plusOne: true, tags: true } },
        payments: { select: { amount: true, status: true, currency: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const guests = event.guests;
    const total = guests.length;
    const confirmed = guests.filter(g => g.status === "CONFIRMED").length;
    const declined = guests.filter(g => g.status === "DECLINED").length;
    const pending = guests.filter(g => g.status === "PENDING").length;
    const checkedIn = guests.filter(g => g.checkedIn).length;
    const plusOnes = guests.filter(g => g.plusOne).length;

    // Check-in timeline (group by hour)
    const timeline: Record<string, number> = {};
    for (const g of guests.filter(g => g.checkedIn && g.checkedInAt)) {
      const hour = new Date(g.checkedInAt!).toISOString().slice(0, 13) + ":00";
      timeline[hour] = (timeline[hour] ?? 0) + 1;
    }

    // Dietary breakdown
    const dietaryMap: Record<string, number> = {};
    for (const g of guests) {
      if (g.dietaryReqs) {
        const key = g.dietaryReqs.trim();
        dietaryMap[key] = (dietaryMap[key] ?? 0) + 1;
      }
    }

    // Revenue
    const completedPayments = event.payments.filter(p => p.status === "COMPLETED");
    const revenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const currency = event.ticketCurrency;

    // Tag breakdown
    const tagMap: Record<string, number> = {};
    for (const g of guests) {
      if (g.tags) {
        for (const t of g.tags.split(",").map(t => t.trim()).filter(Boolean)) {
          tagMap[t] = (tagMap[t] ?? 0) + 1;
        }
      }
    }

    return NextResponse.json({
      data: {
        event: { id: event.id, title: event.title, date: event.date, location: event.location, category: event.category },
        stats: {
          total, confirmed, declined, pending, checkedIn, plusOnes,
          rsvpRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
          attendanceRate: confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0,
          noShowRate: confirmed > 0 ? Math.round(((confirmed - checkedIn) / confirmed) * 100) : 0,
        },
        revenue: { total: revenue, currency, ticketsSold: completedPayments.length },
        timeline: Object.entries(timeline).sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count })),
        dietary: Object.entries(dietaryMap).map(([req, count]) => ({ req, count })).sort((a, b) => b.count - a.count),
        tags: Object.entries(tagMap).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
