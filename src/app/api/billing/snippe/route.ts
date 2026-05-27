import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { initiateCollection } from "@/lib/snippe";
import { PLAN_PRICES } from "@/lib/plan-limits";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // 5 payment attempts per IP per 15 minutes
    if (isRateLimited(`billing:${getClientIp(request)}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many payment attempts. Please wait before trying again." }, { status: 429 });
    }

    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, phone, network } = await request.json();
    if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    if (!network) return NextResponse.json({ error: "Mobile network is required" }, { status: 400 });

    const planInfo = PLAN_PRICES[plan as "PRO" | "BUSINESS"];

    // Reference encodes userId + plan so webhook can activate the right user
    const reference = `sub_${user.userId}_${plan}_${Date.now()}`;

    const result = await initiateCollection({
      amount: planInfo.tzs,
      phone,
      network,
      reference,
      description: `EventCraft ${planInfo.label} Plan — 1 month`,
    });

    return NextResponse.json({ data: { transactionId: result.transactionId, status: result.status } });
  } catch (error) {
    console.error("Snippe billing error:", error);
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 500 });
  }
}
