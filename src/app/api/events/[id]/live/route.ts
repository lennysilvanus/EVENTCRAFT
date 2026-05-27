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
      select: { id: true, title: true, date: true, location: true, maxGuests: true },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const guests = await prisma.guest.findMany({
      where: { eventId: id },
      select: {
        id: true, name: true, email: true, phone: true,
        status: true, checkedIn: true, checkedInAt: true, plusOne: true,
      },
      orderBy: [{ checkedInAt: "desc" }, { createdAt: "asc" }],
    });

    const confirmed = guests.filter(g => g.status === "CONFIRMED").length;
    const checkedIn = guests.filter(g => g.checkedIn).length;
    const pending = guests.filter(g => g.status === "PENDING").length;
    const declined = guests.filter(g => g.status === "DECLINED").length;
    const recentArrivals = guests.filter(g => g.checkedIn).slice(0, 10);

    return NextResponse.json({
      data: {
        event,
        stats: { total: guests.length, confirmed, checkedIn, pending, declined },
        guests,
        recentArrivals,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
