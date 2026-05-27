import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSecurityAdmin, isGuardError } from "@/lib/security-guard";

export async function GET(request: Request) {
  const guard = await requireSecurityAdmin(request);
  if (isGuardError(guard)) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        include: {
          guest: { select: { name: true, email: true } },
          event: { select: { title: true, host: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count(),
    ]);

    const [totalRevenue, pendingCount] = await Promise.all([
      prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      data: payments,
      summary: {
        totalRevenue: totalRevenue._sum.amount ?? 0,
        pending: pendingCount,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Security payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
