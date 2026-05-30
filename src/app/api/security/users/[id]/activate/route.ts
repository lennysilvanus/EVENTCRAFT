import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSecurityAdmin, isGuardError } from "@/lib/security-guard";
import { logAudit } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSecurityAdmin(request);
  if (isGuardError(guard)) return guard;

  const ip = getClientIp(request);
  if (await isRateLimited(`security-action:${guard.user.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many actions. Slow down." }, { status: 429 });
  }

  try {
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, status: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Only ADMIN can reinstate BANNED users — SECURITY_ADMIN can only lift SUSPENDED status
    if (target.status === "BANNED" && guard.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can reinstate banned accounts" }, { status: 403 });
    }

    // Remove the all-tokens block and update status atomically
    await prisma.$transaction([
      prisma.blockedToken.deleteMany({ where: { jti: `user_all_${id}` } }),
      prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }),
    ]);

    await logAudit({
      action: "USER_ACTIVATED",
      actorId: guard.user.userId,
      actorEmail: guard.user.email,
      targetId: id,
      targetType: "USER",
      targetLabel: target.email,
      ip,
    });

    return NextResponse.json({ message: "User activated" });
  } catch (error) {
    console.error("Activate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
