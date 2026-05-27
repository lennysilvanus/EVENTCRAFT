import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This endpoint should be called by a scheduler (e.g. Vercel Cron, cron job).
// Protect it with a shared secret so it's not publicly triggerable.
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [deletedTokens, deletedAttempts] = await Promise.all([
      // Remove expired blocked tokens
      prisma.blockedToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      // Remove login attempts older than 30 days
      prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    ]);

    return NextResponse.json({
      cleaned: {
        blockedTokens: deletedTokens.count,
        loginAttempts: deletedAttempts.count,
      },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
