import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/reset-password/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindFirst = vi.mocked(prisma.user.findFirst);
const mockUpdate    = vi.mocked(prisma.user.update);

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockResolvedValue({} as never);
});

describe("POST /api/auth/reset-password", () => {
  it("returns 200 and success message for a valid token and password", async () => {
    mockFindFirst.mockResolvedValue({ id: "u1", email: "jane@example.com" } as never);

    const res = await POST(makeRequest({ token: "valid_tok_abc", password: "newSecureP@ss" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/reset successfully/i);
  });

  it("clears the reset token fields after a successful reset", async () => {
    mockFindFirst.mockResolvedValue({ id: "u1", email: "jane@example.com" } as never);

    await POST(makeRequest({ token: "valid_tok_abc", password: "newSecureP@ss" }));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({
          passwordResetToken: null,
          passwordResetExpiry: null,
        }),
      })
    );
  });

  it("does not store the plaintext password", async () => {
    mockFindFirst.mockResolvedValue({ id: "u1" } as never);
    let capturedData: Record<string, unknown> | undefined;
    mockUpdate.mockImplementation(async (args: { data: Record<string, unknown> }) => {
      capturedData = args.data;
      return {} as never;
    });

    await POST(makeRequest({ token: "tok", password: "myplaintextpassword" }));
    expect(capturedData?.password).not.toBe("myplaintextpassword");
    expect(typeof capturedData?.password).toBe("string");
  });

  it("returns 400 when token is invalid or expired", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: "bad_token", password: "newSecureP@ss" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid|expired/i);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({ token: "tok", password: "short" }));
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when token field is missing", async () => {
    const res = await POST(makeRequest({ password: "newSecureP@ss" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password field is missing", async () => {
    const res = await POST(makeRequest({ token: "tok" }));
    expect(res.status).toBe(400);
  });
});
