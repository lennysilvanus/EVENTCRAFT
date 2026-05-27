import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSecurityAdmin, isGuardError } from "@/lib/security-guard";
import { blockAllUserTokens } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSecurityAdmin(request);
  if (isGuardError(guard)) return guard;

  const ip = getClientIp(request);
  if (isRateLimited(`security-action:${guard.user.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many actions. Slow down." }, { status: 429 });
  }

  try {
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "ADMIN" || target.role === "SECURITY_ADMIN") {
      return NextResponse.json({ error: "Cannot suspend admin accounts" }, { status: 403 });
    }
    if (target.id === guard.user.userId) {
      return NextResponse.json({ error: "Cannot suspend your own account" }, { status: 403 });
    }

    const { reason } = await request.json().catch(() => ({ reason: "" }));

    await Promise.all([
      prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } }),
      blockAllUserTokens(id),
      logAudit({
        action: "USER_SUSPENDED",
        actorId: guard.user.userId,
        actorEmail: guard.user.email,
        targetId: id,
        targetType: "USER",
        targetLabel: target.email,
        metadata: { reason },
        ip,
      }),
    ]);

    return NextResponse.json({ message: "User suspended" });
  } catch (error) {
    console.error("Suspend error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
