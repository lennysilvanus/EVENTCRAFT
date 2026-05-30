import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientIp } from "@/lib/rate-limit";

// Mock Prisma so the unit test doesn't need a live database.
// We test the isRateLimited logic by controlling what the DB "returns".
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimit: {
      upsert:  vi.fn(),
      update:  vi.fn(),
    },
  },
}));

import { isRateLimited } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const mockUpsert = vi.mocked(prisma.rateLimit.upsert);
const mockUpdate = vi.mocked(prisma.rateLimit.update);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isRateLimited", () => {
  it("allows the first request (count = 1, within limit)", async () => {
    mockUpsert.mockResolvedValue({ key: "k", count: 1, resetAt: new Date(Date.now() + 60_000) });
    expect(await isRateLimited("k1", 5, 60_000)).toBe(false);
  });

  it("allows a request at exactly the limit", async () => {
    mockUpsert.mockResolvedValue({ key: "k", count: 5, resetAt: new Date(Date.now() + 60_000) });
    expect(await isRateLimited("k2", 5, 60_000)).toBe(false);
  });

  it("blocks a request that exceeds the limit", async () => {
    mockUpsert.mockResolvedValue({ key: "k", count: 6, resetAt: new Date(Date.now() + 60_000) });
    expect(await isRateLimited("k3", 5, 60_000)).toBe(true);
  });

  it("resets and allows when the stored window is expired", async () => {
    // DB returns a stale entry (resetAt in the past)
    const past = new Date(Date.now() - 1000);
    mockUpsert.mockResolvedValue({ key: "k", count: 99, resetAt: past });
    mockUpdate.mockResolvedValue({ key: "k", count: 1, resetAt: new Date(Date.now() + 60_000) });
    expect(await isRateLimited("k4", 5, 60_000)).toBe(false);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("continues blocking on subsequent requests beyond the limit", async () => {
    mockUpsert.mockResolvedValue({ key: "k", count: 10, resetAt: new Date(Date.now() + 60_000) });
    expect(await isRateLimited("k5", 5, 60_000)).toBe(true);
    // Another call — still over the limit
    mockUpsert.mockResolvedValue({ key: "k", count: 11, resetAt: new Date(Date.now() + 60_000) });
    expect(await isRateLimited("k5", 5, 60_000)).toBe(true);
  });

  it("treats different keys independently", async () => {
    // Key A is blocked, key B is not
    mockUpsert
      .mockResolvedValueOnce({ key: "ka", count: 6, resetAt: new Date(Date.now() + 60_000) })
      .mockResolvedValueOnce({ key: "kb", count: 1, resetAt: new Date(Date.now() + 60_000) });
    expect(await isRateLimited("ka", 5, 60_000)).toBe(true);
    expect(await isRateLimited("kb", 5, 60_000)).toBe(false);
  });

  it("fails open (returns false) if the database throws", async () => {
    mockUpsert.mockRejectedValue(new Error("DB connection lost"));
    expect(await isRateLimited("k8", 5, 60_000)).toBe(false);
  });
});

describe("getClientIp", () => {
  it("returns the first IP from x-forwarded-for", () => {
    const req = new Request("http://localhost/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns a single IP when no proxy chain", () => {
    const req = new Request("http://localhost/", { headers: { "x-forwarded-for": "9.9.9.9" } });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when header is absent", () => {
    expect(getClientIp(new Request("http://localhost/"))).toBe("unknown");
  });

  it("trims whitespace from the IP", () => {
    const req = new Request("http://localhost/", { headers: { "x-forwarded-for": "  10.0.0.1  , 10.0.0.2" } });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });
});
