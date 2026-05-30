import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/auth/erasure/route";

vi.mock("@/lib/auth", () => ({
  getAuthUserFromCookies: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user:        { findUnique: vi.fn(), update: vi.fn() },
    guest:       { updateMany: vi.fn() },
    event:       { updateMany: vi.fn() },
    auditLog:    { updateMany: vi.fn() },
    loginAttempt: { deleteMany: vi.fn() },
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user:        { findUnique: vi.fn().mockResolvedValue({ email: "jane@example.com" }), update: vi.fn().mockResolvedValue({}) },
        guest:       { updateMany: vi.fn().mockResolvedValue({}) },
        event:       { updateMany: vi.fn().mockResolvedValue({}) },
        auditLog:    { updateMany: vi.fn().mockResolvedValue({}) },
        loginAttempt: { deleteMany: vi.fn().mockResolvedValue({}) },
      })
    ),
  },
}));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: vi.fn().mockReturnValue("1.2.3.4") }));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ delete: vi.fn() }),
}));

import { getAuthUserFromCookies } from "@/lib/auth";
const mockAuth = vi.mocked(getAuthUserFromCookies);

function makeRequest() {
  return new Request("http://localhost/api/auth/erasure", { method: "DELETE" });
}

beforeEach(() => vi.clearAllMocks());

describe("DELETE /api/auth/erasure", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 200 and success message for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "u1", email: "jane@example.com", name: "Jane", role: "USER", status: "ACTIVE", jti: "j1" });
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeTruthy();
  });
});
