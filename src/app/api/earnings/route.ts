import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { PLATFORM_FEE_RATE } from "@/lib/snippe-constants";

export async function GET(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payments = await prisma.payment.findMany({
      where: {
        event: { hostId: user.userId },
        status: "COMPLETED",
      },
      include: {
        guest: { select: { name: true, email: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const currency = payments[0]?.currency ?? "TZS";

    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const totalFees = payments.reduce((s, p) => s + (p.platformFee ?? Math.round(p.amount * PLATFORM_FEE_RATE)), 0);
    const totalPaidOut = payments
      .filter(p => p.payoutStatus === "SENT")
      .reduce((s, p) => s + (p.amount - (p.platformFee ?? Math.round(p.amount * PLATFORM_FEE_RATE))), 0);
    const pendingPayout = payments
      .filter(p => p.payoutStatus !== "SENT")
      .reduce((s, p) => s + (p.amount - (p.platformFee ?? Math.round(p.amount * PLATFORM_FEE_RATE))), 0);

    return NextResponse.json({
      data: {
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          provider: p.provider,
          platformFee: p.platformFee,
          payoutStatus: p.payoutStatus,
          createdAt: p.createdAt,
          guest: p.guest,
          event: p.event,
        })),
        summary: { totalCollected, totalFees, totalPaidOut, pendingPayout, currency },
      },
    });
  } catch (error) {
    console.error("GET earnings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
