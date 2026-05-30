import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fullUser = await prisma.user.findUnique({
    where:  { id: user.userId },
    select: { plan: true, planInterval: true, planExpiresAt: true },
  });

  if (!fullUser || fullUser.plan === "FREE") {
    return NextResponse.json({ error: "You are already on the free plan" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.userId },
    data:  { plan: "FREE", planInterval: "MONTHLY", planExpiresAt: null },
  });

  await logAudit({
    action:      "PLAN_CHANGED",
    actorId:     user.userId,
    actorEmail:  user.email,
    targetId:    user.userId,
    targetType:  "USER",
    targetLabel: user.email,
    metadata:    { from: fullUser.plan, to: "FREE", reason: "user_cancelled" },
    ip:          getClientIp(request),
  });

  return NextResponse.json({ data: { plan: "FREE" } });
}
