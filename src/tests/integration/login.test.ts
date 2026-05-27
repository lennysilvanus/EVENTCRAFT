import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { hashPassword } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    loginAttempt: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  getClientIp: vi.fn().mockReturnValue("1.2.3.4"),
}));

import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  loginAttempt: { create: ReturnType<typeof vi.fn> };
};

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockReturnValue(false);
});

describe("POST /api/auth/login", () => {
  it("returns 200 and sets cookie with correct credentials", async () => {
    const passwordHash = await hashPassword("correct_password");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "user@example.com",
      password: passwordHash,
      name: "Test User",
      role: "USER",
      plan: "FREE",
      planExpiresAt: null,
      status: "ACTIVE",
    });

    const res = await POST(makeRequest({ email: "user@example.com", password: "correct_password" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe("user@example.com");
    expect(res.headers.get("set-cookie")).toMatch(/token=/);
  });

  it("returns 401 with wrong password", async () => {
    const passwordHash = await hashPassword("correct_password");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1", email: "user@example.com", password: passwordHash,
      name: "Test User", role: "USER", plan: "FREE", planExpiresAt: null, status: "ACTIVE",
    });

    const res = await POST(makeRequest({ email: "user@example.com", password: "wrong_password" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 401 for non-existent user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "nobody@example.com", password: "password123" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-an-email", password: "password123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ password: "password123" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockReturnValue(true);
    const res = await POST(makeRequest({ email: "user@example.com", password: "password123" }));
    expect(res.status).toBe(429);
  });

  it("does not expose password hash in response", async () => {
    const passwordHash = await hashPassword("password");
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1", email: "u@example.com", password: passwordHash,
      name: "U", role: "USER", plan: "FREE", planExpiresAt: null, status: "ACTIVE",
    });

    const res = await POST(makeRequest({ email: "u@example.com", password: "password" }));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain(passwordHash);
  });
});
