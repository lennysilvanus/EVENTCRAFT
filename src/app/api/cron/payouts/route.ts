import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { disburseMobileMoney, disburseBank } from "@/lib/snippe";
import { MIN_PLATFORM_FEE_TZS } from "@/lib/plan-limits";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Batch: up to 50 per run to avoid timeout.
    // Only pick payments that are not already being processed (PROCESSING guard
    // prevents the double-payout race when cron overlaps or retries quickly).
    const payments = await prisma.payment.findMany({
      where: { status: "COMPLETED", payoutStatus: "PENDING" },
      include: {
        event: {
          include: {
            host: {
              include: { payoutMethods: { where: { isDefault: true }, take: 1 } },
            },
          },
        },
      },
      take: 50,
    });

    let sent = 0, failed = 0, skipped = 0;

    for (const payment of payments) {
      const payout = payment.event.host.payoutMethods[0];
      if (!payout) { skipped++; continue; }

      const net = payment.amount - Math.max(payment.platformFee ?? 0, MIN_PLATFORM_FEE_TZS);
      if (net <= 0) { skipped++; continue; }

      // Mark as PROCESSING before calling the external API.
      // This prevents a second cron run from picking up the same payment
      // if the first run is slow to commit. If the process crashes after
      // marking PROCESSING but before writing SENT, the payment stays in
      // PROCESSING and requires manual review — a much safer failure mode
      // than a double-payout.
      await prisma.payment.update({
        where: { id: payment.id },
        data:  { payoutStatus: "PROCESSING" },
      });

      const logBase = {
        paymentId:     payment.id,
        amount:        net,
        phone:         payout.phone ?? undefined,
        network:       payout.network ?? undefined,
        bankCode:      payout.bankCode ?? undefined,
        accountNumber: payout.accountNumber ?? undefined,
      };

      try {
        let result;

        if (payout.type === "mobile_money" && payout.phone && payout.network) {
          result = await disburseMobileMoney({
            amount:    net,
            phone:     payout.phone,
            network:   payout.network,
            reference: payment.id,
          });
        } else if (
          payout.type === "bank_transfer" &&
          payout.accountNumber && payout.bankCode && payout.accountName
        ) {
          result = await disburseBank({
            amount:        net,
            accountNumber: payout.accountNumber,
            bankCode:      payout.bankCode,
            accountName:   payout.accountName,
            reference:     payment.id,
          });
        } else {
          // Restore PENDING so this payment is retried next run
          await prisma.payment.update({ where: { id: payment.id }, data: { payoutStatus: "PENDING" } });
          skipped++;
          continue;
        }

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data:  { payoutStatus: "SENT", payoutId: result.disbursementId },
          }),
          prisma.payoutLog.create({
            data: {
              ...logBase,
              payoutId:    result.disbursementId,
              status:      "SENT",
              rawResponse: JSON.stringify(result),
            },
          }),
        ]);

        sent++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Payout] Failed for payment ${payment.id}:`, errorMessage);

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data:  { payoutStatus: "FAILED" },
          }),
          prisma.payoutLog.create({
            data: { ...logBase, status: "FAILED", errorMessage },
          }),
        ]);

        failed++;
      }
    }

    console.log("[Cron/payouts]", { sent, failed, skipped });
    return NextResponse.json({ ok: true, processed: { sent, failed, skipped } });
  } catch (error) {
    console.error("[Cron/payouts] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
