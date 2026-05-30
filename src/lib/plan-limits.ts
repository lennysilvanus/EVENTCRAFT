export const PLAN_LIMITS = {
  FREE:     { events: 3,        guests: 50,       teamMembers: 0,  aiGenerations: 1        },
  PRO:      { events: Infinity, guests: 500,      teamMembers: 5,  aiGenerations: 3        },
  BUSINESS: { events: Infinity, guests: Infinity, teamMembers: 20, aiGenerations: Infinity },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

// Monthly subscription prices (TZS)
export const PLAN_PRICES_MONTHLY: Record<"PRO" | "BUSINESS", { tzs: number; label: string }> = {
  PRO:      { tzs: 45_000,  label: "Pro"      },
  BUSINESS: { tzs: 250_000, label: "Business" },
};

// Annual subscription prices (TZS) — ~15% saving vs 12 × monthly.
// Intentionally modest: deep discounts push sophisticated customers to annual
// and concentrate renewal risk at 12-month intervals.
export const PLAN_PRICES_ANNUAL: Record<"PRO" | "BUSINESS", { tzs: number; label: string }> = {
  PRO:      { tzs: 460_000,   label: "Pro"      },  // 45,000×12 = 540,000 → 15% off
  BUSINESS: { tzs: 2_550_000, label: "Business" },  // 250,000×12 = 3,000,000 → 15% off
};

// Legacy export
export const PLAN_PRICES = PLAN_PRICES_MONTHLY;

// Pay-per-event credit — priced close to the monthly pro plan to nudge
// towards subscriptions rather than indefinite credit purchases.
export const EVENT_CREDIT_PRICE_TZS = 15_000;

// Maximum unused event credits a user may hold at any time.
// Prevents stockpiling and protects subscription conversion rates.
export const MAX_UNUSED_EVENT_CREDITS = 3;

// Minimum platform fee per transaction (TZS).
// Prevents the percentage fee from rounding to zero on very small tickets.
export const MIN_PLATFORM_FEE_TZS = 1_000;

export function getEffectivePlan(plan: string, planExpiresAt?: Date | null, role?: string): Plan {
  if (role === "ADMIN" || role === "SECURITY_ADMIN") return "BUSINESS";
  if (plan === "FREE") return "FREE";
  const isExpired = planExpiresAt ? planExpiresAt < new Date() : true;
  if (isExpired) return "FREE";
  return (plan as Plan) in PLAN_LIMITS ? (plan as Plan) : "FREE";
}

export function getPlanLimits(plan: string, planExpiresAt?: Date | null, role?: string) {
  return PLAN_LIMITS[getEffectivePlan(plan, planExpiresAt, role)];
}

export function annualSaving(plan: "PRO" | "BUSINESS"): number {
  return PLAN_PRICES_MONTHLY[plan].tzs * 12 - PLAN_PRICES_ANNUAL[plan].tzs;
}
