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
    const event = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { reason } = await request.json().catch(() => ({ reason: "" }));

    await Promise.all([
      prisma.event.update({ where: { id }, data: { status: "DRAFT" } }),
      logAudit({
        action: "EVENT_UNPUBLISHED",
        actorId: guard.user.userId,
        actorEmail: guard.user.email,
        targetId: id,
        targetType: "EVENT",
        targetLabel: event.title,
        metadata: { reason },
        ip,
      }),
    ]);

    return NextResponse.json({ message: "Event unpublished" });
  } catch (error) {
    console.error("Unpublish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
