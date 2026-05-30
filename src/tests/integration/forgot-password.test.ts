import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
  getClientIp:   vi.fn().mockReturnValue("1.2.3.4"),
}));

// Dynamic import inside the route — mock it so no real emails are sent
vi.mock("@/lib/email", () => ({
  sendPasswordReset: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate     = vi.mocked(prisma.user.update);

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GENERIC_MSG = "If that email exists, a reset link has been sent.";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockResolvedValue(false);
  mockUpdate.mockResolvedValue({} as never);
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 with generic message when email exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" } as never);

    const res = await POST(makeRequest({ email: "jane@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe(GENERIC_MSG);
  });

  it("stores a reset token when email exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", name: "Jane", email: "jane@example.com" } as never);

    await POST(makeRequest({ email: "jane@example.com" }));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({
          passwordResetToken: expect.any(String),
          passwordResetExpiry: expect.any(Date),
        }),
      })
    );
  });

  it("returns 200 with generic message for unknown email (prevents enumeration)", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "ghost@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe(GENERIC_MSG);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email field is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 with generic message when rate limited (no 429 — avoids enumeration)", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const res = await POST(makeRequest({ email: "jane@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe(GENERIC_MSG);
  });

  it("does not update user when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    await POST(makeRequest({ email: "jane@example.com" }));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
