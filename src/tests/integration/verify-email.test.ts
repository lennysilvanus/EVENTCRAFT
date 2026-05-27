import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/auth/verify-email/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/auth/verify-email?token=${token}`
    : "http://localhost/api/auth/verify-email";
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.update.mockResolvedValue({});
});

describe("GET /api/auth/verify-email", () => {
  it("returns 400 when token is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 for an unknown token", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("invalid_token_xyz"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("returns 200 and marks user verified for a valid token", async () => {
    const future = new Date(Date.now() + 60_000);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: false,
      emailVerificationExpiry: future,
    });

    const res = await GET(makeRequest("valid_token_abc"));
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: expect.objectContaining({
          emailVerified: true,
          emailVerificationToken: null,
        }),
      })
    );
  });

  it("returns 400 for an expired token", async () => {
    const past = new Date(Date.now() - 1000);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: false,
      emailVerificationExpiry: past,
    });

    const res = await GET(makeRequest("expired_token"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it("returns 200 without re-updating for already-verified user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      emailVerified: true,
      emailVerificationExpiry: null,
    });

    const res = await GET(makeRequest("already_used_token"));
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
