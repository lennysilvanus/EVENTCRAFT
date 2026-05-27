import { describe, it, expect } from "vitest";
import { getEffectivePlan, getPlanLimits, PLAN_LIMITS } from "@/lib/plan-limits";

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const past   = new Date(Date.now() - 1000);

describe("getEffectivePlan", () => {
  it("returns FREE for FREE plan regardless of expiry", () => {
    expect(getEffectivePlan("FREE")).toBe("FREE");
    expect(getEffectivePlan("FREE", future)).toBe("FREE");
    expect(getEffectivePlan("FREE", past)).toBe("FREE");
  });

  it("returns PRO when plan is PRO and not expired", () => {
    expect(getEffectivePlan("PRO", future)).toBe("PRO");
  });

  it("returns BUSINESS when plan is BUSINESS and not expired", () => {
    expect(getEffectivePlan("BUSINESS", future)).toBe("BUSINESS");
  });

  it("downgrades to FREE when PRO plan is expired", () => {
    expect(getEffectivePlan("PRO", past)).toBe("FREE");
  });

  it("downgrades to FREE when BUSINESS plan is expired", () => {
    expect(getEffectivePlan("BUSINESS", past)).toBe("FREE");
  });

  it("downgrades to FREE when PRO plan has no expiry date", () => {
    expect(getEffectivePlan("PRO", null)).toBe("FREE");
    expect(getEffectivePlan("PRO", undefined)).toBe("FREE");
  });

  it("returns FREE for unknown plan strings", () => {
    expect(getEffectivePlan("ENTERPRISE", future)).toBe("FREE");
    expect(getEffectivePlan("", future)).toBe("FREE");
  });
});

describe("getPlanLimits", () => {
  it("returns FREE limits for FREE plan", () => {
    const limits = getPlanLimits("FREE");
    expect(limits.events).toBe(3);
    expect(limits.guests).toBe(50);
    expect(limits.teamMembers).toBe(0);
  });

  it("returns PRO limits for active PRO plan", () => {
    const limits = getPlanLimits("PRO", future);
    expect(limits.events).toBe(Infinity);
    expect(limits.guests).toBe(500);
    expect(limits.teamMembers).toBe(5);
  });

  it("returns BUSINESS limits for active BUSINESS plan", () => {
    const limits = getPlanLimits("BUSINESS", future);
    expect(limits.events).toBe(Infinity);
    expect(limits.guests).toBe(Infinity);
    expect(limits.teamMembers).toBe(20);
  });

  it("returns FREE limits when PRO plan is expired", () => {
    const limits = getPlanLimits("PRO", past);
    expect(limits).toEqual(PLAN_LIMITS.FREE);
  });

  it("returns FREE limits when no expiry is provided for paid plan", () => {
    const limits = getPlanLimits("PRO");
    expect(limits).toEqual(PLAN_LIMITS.FREE);
  });
});
