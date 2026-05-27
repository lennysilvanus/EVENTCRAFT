import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSecurityAdmin, isGuardError } from "@/lib/security-guard";

export async function GET(request: Request) {
  const guard = await requireSecurityAdmin(request);
  if (isGuardError(guard)) return guard;

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      failedLogins24h,
      successLogins24h,
      newUsers7d,
      totalEvents,
      publishedEvents,
      totalPayments,
      pendingPayments,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count({ where: { status: "BANNED" } }),
      prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: since24h } } }),
      prisma.loginAttempt.count({ where: { success: true, createdAt: { gte: since24h } } }),
      prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      prisma.event.count(),
      prisma.event.count({ where: { status: "PUBLISHED" } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    return NextResponse.json({
      data: {
        users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers, newLast7d: newUsers7d },
        logins: { failed24h: failedLogins24h, success24h: successLogins24h },
        events: { total: totalEvents, published: publishedEvents },
        payments: { total: totalPayments, pending: pendingPayments },
        recentAuditLogs,
      },
    });
  } catch (error) {
    console.error("Security stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
