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
    const filter = searchParams.get("filter") ?? "ALL"; // ALL | FAILED | SUCCESS
    const skip = (page - 1) * limit;

    const where = filter === "FAILED" ? { success: false } : filter === "SUCCESS" ? { success: true } : {};

    const [attempts, total] = await prisma.$transaction([
      prisma.loginAttempt.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.loginAttempt.count({ where }),
    ]);

    // Top offending IPs (last 24h, failed only)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const topIps = await prisma.loginAttempt.groupBy({
      by: ["ip"],
      where: { success: false, createdAt: { gte: since24h } },
      _count: { ip: true },
      orderBy: { _count: { ip: "desc" } },
      take: 5,
    });

    return NextResponse.json({
      data: attempts,
      topFailingIps: topIps.map(r => ({ ip: r.ip, count: r._count.ip })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Login attempts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
