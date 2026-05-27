import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalUsers, totalEvents, totalGuests, confirmedGuests, checkedIn, recentEvents] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.guest.count(),
      prisma.guest.count({ where: { status: "CONFIRMED" } }),
      prisma.guest.count({ where: { checkedIn: true } }),
      prisma.event.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          host: { select: { name: true, email: true } },
          _count: { select: { guests: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: { totalUsers, totalEvents, totalGuests, confirmedGuests, checkedIn, recentEvents },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
