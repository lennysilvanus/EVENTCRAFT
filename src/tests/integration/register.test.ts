import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  getClientIp: vi.fn().mockReturnValue("1.2.3.4"),
}));

import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockReturnValue(false);
});

describe("POST /api/auth/register", () => {
  it("creates a new user and returns 201", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user_1",
      email: "test@example.com",
      name: "Test User",
      role: "USER",
      plan: "FREE",
    });

    const res = await POST(makeRequest({ name: "Test User", email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.email).toBe("test@example.com");
  });

  it("returns 409 when email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const res = await POST(makeRequest({ name: "Test User", email: "taken@example.com", password: "password123" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already exists/i);
  });

  it("returns 400 when name is too short", async () => {
    const res = await POST(makeRequest({ name: "A", email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(makeRequest({ name: "Test User", email: "not-an-email", password: "password123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({ name: "Test User", email: "test@example.com", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockReturnValue(true);
    const res = await POST(makeRequest({ name: "Test User", email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(429);
  });

  it("sets httpOnly auth cookie on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user_2", email: "cookie@example.com", name: "Cookie", role: "USER", plan: "FREE",
    });

    const res = await POST(makeRequest({ name: "Cookie", email: "cookie@example.com", password: "password123" }));
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toMatch(/token=/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });
});
