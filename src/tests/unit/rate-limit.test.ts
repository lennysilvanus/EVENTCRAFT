import { describe, it, expect } from "vitest";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// Use unique key prefixes per test group to avoid cross-test interference
// since the store is module-level.

describe("isRateLimited", () => {
  it("allows the first request", () => {
    expect(isRateLimited("rl-test-first:1.1.1.1", 5, 60_000)).toBe(false);
  });

  it("allows requests up to the limit", () => {
    const key = "rl-test-upto:2.2.2.2";
    const limit = 3;
    expect(isRateLimited(key, limit, 60_000)).toBe(false); // 1
    expect(isRateLimited(key, limit, 60_000)).toBe(false); // 2
    expect(isRateLimited(key, limit, 60_000)).toBe(false); // 3
  });

  it("blocks the request that exceeds the limit", () => {
    const key = "rl-test-block:3.3.3.3";
    const limit = 2;
    isRateLimited(key, limit, 60_000); // 1 — allowed
    isRateLimited(key, limit, 60_000); // 2 — allowed
    expect(isRateLimited(key, limit, 60_000)).toBe(true); // 3 — blocked
  });

  it("continues blocking after the limit is exceeded", () => {
    const key = "rl-test-keep-blocking:4.4.4.4";
    const limit = 1;
    isRateLimited(key, limit, 60_000); // 1 — allowed
    isRateLimited(key, limit, 60_000); // 2 — blocked
    expect(isRateLimited(key, limit, 60_000)).toBe(true); // 3 — still blocked
  });

  it("resets the counter after the window expires", async () => {
    const key = "rl-test-reset:5.5.5.5";
    const limit = 1;
    const windowMs = 50; // 50ms window
    isRateLimited(key, limit, windowMs); // 1 — allowed
    isRateLimited(key, limit, windowMs); // 2 — blocked
    // Wait for window to expire
    await new Promise(r => setTimeout(r, 60));
    expect(isRateLimited(key, limit, windowMs)).toBe(false); // fresh window
  });

  it("treats different keys independently", () => {
    const limit = 1;
    expect(isRateLimited("rl-indep:a", limit, 60_000)).toBe(false);
    expect(isRateLimited("rl-indep:b", limit, 60_000)).toBe(false);
    // second call on :a should be blocked, :b should still be fine
    expect(isRateLimited("rl-indep:a", limit, 60_000)).toBe(true);
    expect(isRateLimited("rl-indep:b", limit, 60_000)).toBe(true);
  });
});

describe("getClientIp", () => {
  it("returns the first IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns a single IP when no proxy chain", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when header is absent", () => {
    const req = new Request("http://localhost/");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from the IP", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "  10.0.0.1  , 10.0.0.2" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });
});
