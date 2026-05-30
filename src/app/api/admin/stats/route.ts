import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      totalEvents,
      totalGuests,
      confirmedGuests,
      checkedIn,
      recentEvents,
      // Revenue metrics
      allTimeFees,
      thisMonthFees,
      lastMonthFees,
      pendingPayouts,
      planBreakdown,
    ] = await Promise.all([
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
      // All-time platform fees from completed payments
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { platformFee: true, amount: true },
        _count: true,
      }),
      // This month
      prisma.payment.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: monthStart } },
        _sum: { platformFee: true, amount: true },
        _count: true,
      }),
      // Last month (for comparison)
      prisma.payment.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: lastMonthStart, lt: monthStart } },
        _sum: { platformFee: true },
      }),
      // Payments awaiting payout
      prisma.payment.aggregate({
        where: { status: "COMPLETED", payoutStatus: "PENDING" },
        _sum: { amount: true, platformFee: true },
        _count: true,
      }),
      // User plan breakdown
      prisma.user.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalUsers,
        totalEvents,
        totalGuests,
        confirmedGuests,
        checkedIn,
        recentEvents,
        revenue: {
          allTime: {
            fees: allTimeFees._sum.platformFee ?? 0,
            volume: allTimeFees._sum.amount ?? 0,
            transactions: allTimeFees._count,
          },
          thisMonth: {
            fees: thisMonthFees._sum.platformFee ?? 0,
            volume: thisMonthFees._sum.amount ?? 0,
            transactions: thisMonthFees._count,
          },
          lastMonthFees: lastMonthFees._sum.platformFee ?? 0,
          pendingPayouts: {
            count: pendingPayouts._count,
            amount: (pendingPayouts._sum.amount ?? 0) - (pendingPayouts._sum.platformFee ?? 0),
          },
        },
        planBreakdown: planBreakdown.reduce<Record<string, number>>((acc, row) => {
          acc[row.plan] = row._count.plan;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
