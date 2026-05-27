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
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "ADMIN" || (target.role === "SECURITY_ADMIN" && guard.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Cannot revoke sessions for admin accounts" }, { status: 403 });
    }

    await Promise.all([
      blockAllUserTokens(id),
      logAudit({
        action: "USER_SESSION_REVOKED",
        actorId: guard.user.userId,
        actorEmail: guard.user.email,
        targetId: id,
        targetType: "USER",
        targetLabel: target.email,
        ip,
      }),
    ]);

    return NextResponse.json({ message: "Session revoked — user will be logged out on next request" });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
