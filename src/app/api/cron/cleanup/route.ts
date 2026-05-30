import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now            = new Date();
    const thirtyDaysAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Use a 3-hour window for stale PENDING payments.
    // Snippe's USSD timeout is ~90 seconds but webhook delivery can be
    // delayed by minutes. 3 hours gives a generous buffer before we call
    // their status API to confirm the payment genuinely failed.
    const threeHoursAgo  = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const [deletedTokens, deletedAttempts, deletedRateLimits, stalePayments] = await Promise.all([
      prisma.blockedToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } }),
      // L-4: Purge expired rate-limit entries — these were never cleaned up previously
      prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
      prisma.payment.findMany({
        where: { status: "PENDING", createdAt: { lt: threeHoursAgo } },
        select: { id: true, guestId: true, snippeId: true },
      }),
    ]);

    let orphanedGuests = 0;
    const apiKey = process.env.SNIPPE_API_KEY;

    for (const payment of stalePayments) {
      // If we have a Snippe transaction ID, verify it actually failed before
      // deleting. This prevents losing guests whose webhook was simply delayed.
      if (payment.snippeId && apiKey) {
        try {
          const res = await fetch(`https://api.snippe.sh/v1/payments/${payment.snippeId}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (res.ok) {
            const json = await res.json() as { data?: { status?: string } };
            const liveStatus = json?.data?.status ?? "";
            // If Snippe shows the payment as completed or pending, don't delete
            if (liveStatus === "success" || liveStatus === "pending") {
              console.log(`[Cleanup] Skipping payment ${payment.id} — Snippe status: ${liveStatus}`);
              continue;
            }
          }
        } catch (err) {
          // Snippe API unreachable — skip this payment and let the next cron run retry
          console.warn(`[Cleanup] Could not verify payment ${payment.id} with Snippe:`, err);
          continue;
        }
      }

      // Confirmed failed or no transaction ID (never reached Snippe) — delete
      const deleted = await prisma.guest.deleteMany({
        where: { id: payment.guestId, status: "PENDING" },
      });
      orphanedGuests += deleted.count;
    }

    return NextResponse.json({
      cleaned: {
        blockedTokens:  deletedTokens.count,
        loginAttempts:  deletedAttempts.count,
        rateLimits:     deletedRateLimits.count,
        orphanedGuests,
      },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
