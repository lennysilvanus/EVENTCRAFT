export const PLAN_LIMITS = {
  FREE:     { events: 3,        guests: 50,       teamMembers: 0  },
  PRO:      { events: Infinity, guests: 500,      teamMembers: 5  },
  BUSINESS: { events: Infinity, guests: Infinity, teamMembers: 20 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

// TZS prices per month
export const PLAN_PRICES: Record<"PRO" | "BUSINESS", { tzs: number; label: string }> = {
  PRO:      { tzs: 25000, label: "Pro"      },
  BUSINESS: { tzs: 75000, label: "Business" },
};

export function getEffectivePlan(plan: string, planExpiresAt?: Date | null): Plan {
  if (plan === "FREE") return "FREE";
  const isExpired = planExpiresAt ? planExpiresAt < new Date() : true;
  if (isExpired) return "FREE";
  return (plan as Plan) in PLAN_LIMITS ? (plan as Plan) : "FREE";
}

export function getPlanLimits(plan: string, planExpiresAt?: Date | null) {
  return PLAN_LIMITS[getEffectivePlan(plan, planExpiresAt)];
}
