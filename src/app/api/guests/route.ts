import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const search = (searchParams.get("search") ?? "").toLowerCase().trim();

    const events = await prisma.event.findMany({
      where: { hostId: user.id },
      select: { id: true, title: true, date: true },
    });
    const eventIds = events.map(e => e.id);

    const guests = await prisma.guest.findMany({
      where: { eventId: { in: eventIds } },
      include: { event: { select: { id: true, title: true, date: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Group by email (or guest id when no email) into CRM records
    const crmMap = new Map<string, {
      key: string;
      name: string;
      email: string | null;
      phone: string | null;
      appearances: { eventId: string; eventTitle: string; eventDate: Date; status: string; checkedIn: boolean }[];
      tags: string[];
    }>();

    for (const g of guests) {
      const key = g.email?.toLowerCase() ?? `no-email-${g.id}`;
      if (!crmMap.has(key)) {
        crmMap.set(key, { key, name: g.name, email: g.email, phone: g.phone, appearances: [], tags: [] });
      }
      const record = crmMap.get(key)!;
      record.appearances.push({
        eventId: g.event.id, eventTitle: g.event.title,
        eventDate: g.event.date, status: g.status, checkedIn: g.checkedIn,
      });
      if (g.tags) {
        for (const tag of g.tags.split(",").map(t => t.trim()).filter(Boolean)) {
          if (!record.tags.includes(tag)) record.tags.push(tag);
        }
      }
    }

    const all = Array.from(crmMap.values())
      .map(r => ({
        ...r,
        totalEvents: r.appearances.length,
        confirmed: r.appearances.filter(a => a.status === "CONFIRMED").length,
        attended:  r.appearances.filter(a => a.checkedIn).length,
        lastSeen:  r.appearances
          .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())[0]?.eventDate ?? null,
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents);

    // Apply search filter
    const filtered = search
      ? all.filter(r =>
          r.name.toLowerCase().includes(search) ||
          r.email?.toLowerCase().includes(search) ||
          r.phone?.includes(search)
        )
      : all;

    const total = filtered.length;
    const pages = Math.ceil(total / limit);
    const data  = filtered.slice((page - 1) * limit, page * limit);

    // Summary stats always reflect the full (unfiltered) dataset
    const stats = {
      total:      all.length,
      repeat:     all.filter(r => r.totalEvents > 1).length,
      vip:        all.filter(r => r.totalEvents >= 5).length,
      avgAttend:  all.length > 0
        ? Math.round(all.reduce((s, r) => s + (r.confirmed > 0 ? r.attended / r.confirmed : 0), 0) / all.length * 100)
        : 0,
    };

    return NextResponse.json({ data, pagination: { page, limit, total, pages }, stats });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
