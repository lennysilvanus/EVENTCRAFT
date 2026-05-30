import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { initiateCollection } from "@/lib/snippe";
import { PLAN_PRICES_MONTHLY, PLAN_PRICES_ANNUAL, EVENT_CREDIT_PRICE_TZS, MAX_UNUSED_EVENT_CREDITS } from "@/lib/plan-limits";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 5 payment attempts per IP per 15 minutes
    if (await isRateLimited(`billing:${getClientIp(request)}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many payment attempts. Please wait before trying again." }, { status: 429 });
    }

    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { phone, network, type } = body;

    if (!phone)   return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    if (!network) return NextResponse.json({ error: "Mobile network is required" }, { status: 400 });

    // ── Pay-per-event credit ───────────────────────────────────────────────────
    if (type === "event_credit") {
      // Prevent stockpiling: a user may not hold more than MAX_UNUSED_EVENT_CREDITS
      // unused credits at any time. This protects subscription conversion rates and
      // prevents the credit system from becoming a permanent subscription bypass.
      const currentUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { eventCredits: true },
      });
      if ((currentUser?.eventCredits ?? 0) >= MAX_UNUSED_EVENT_CREDITS) {
        return NextResponse.json({
          error: `You already have ${currentUser?.eventCredits} unused event credit${currentUser?.eventCredits !== 1 ? "s" : ""}. Use your existing credits before purchasing more (max ${MAX_UNUSED_EVENT_CREDITS} unused at a time).`,
          code:  "CREDIT_LIMIT_REACHED",
        }, { status: 403 });
      }

      const reference = `credit_${user.userId}_${Date.now()}`;
      const result = await initiateCollection({
        amount:      EVENT_CREDIT_PRICE_TZS,
        phone,
        network,
        reference,
        description: "EventCraft — 1 Event Credit",
      });
      return NextResponse.json({ data: { transactionId: result.transactionId, status: result.status } });
    }

    // ── Plan subscription ──────────────────────────────────────────────────────
    const { plan, interval = "MONTHLY" } = body;

    if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!["MONTHLY", "ANNUAL"].includes(interval)) {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const prices    = interval === "ANNUAL" ? PLAN_PRICES_ANNUAL : PLAN_PRICES_MONTHLY;
    const planInfo  = prices[plan as "PRO" | "BUSINESS"];
    const reference = `sub_${user.userId}_${plan}_${interval}_${Date.now()}`;
    const periodLabel = interval === "ANNUAL" ? "1 year" : "1 month";

    const result = await initiateCollection({
      amount:      planInfo.tzs,
      phone,
      network,
      reference,
      description: `EventCraft ${planInfo.label} Plan — ${periodLabel}`,
    });

    return NextResponse.json({ data: { transactionId: result.transactionId, status: result.status } });
  } catch (error) {
    console.error("Snippe billing error:", error);
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 500 });
  }
}
