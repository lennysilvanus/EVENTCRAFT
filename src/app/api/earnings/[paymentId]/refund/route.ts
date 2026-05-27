import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { paymentId } = await params;

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, event: { hostId: user.userId } },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "REFUNDED") {
      return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    }

    // Mark as refunded in DB
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED", payoutStatus: "FAILED" },
    });

    // Optionally update guest status to DECLINED
    await prisma.guest.update({
      where: { id: payment.guestId },
      data: { status: "DECLINED" },
    }).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
