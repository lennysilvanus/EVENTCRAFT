import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: vi.fn() },
  },
}));

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const mockCreate = vi.mocked(prisma.auditLog.create);

beforeEach(() => vi.clearAllMocks());

describe("logAudit", () => {
  const base = {
    action: "LOGIN_SUCCESS" as const,
    actorId: "user_1",
    actorEmail: "admin@example.com",
  };

  it("calls prisma.auditLog.create with required fields", async () => {
    mockCreate.mockResolvedValue({} as never);
    await logAudit(base);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "LOGIN_SUCCESS",
          actorId: "user_1",
          actorEmail: "admin@example.com",
        }),
      })
    );
  });

  it("serialises metadata to JSON when provided", async () => {
    mockCreate.mockResolvedValue({} as never);
    await logAudit({ ...base, metadata: { reason: "test", count: 3 } });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: JSON.stringify({ reason: "test", count: 3 }),
        }),
      })
    );
  });

  it("stores null for metadata when not provided", async () => {
    mockCreate.mockResolvedValue({} as never);
    await logAudit(base);
    const call = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.metadata).toBeNull();
  });

  it("includes optional fields when supplied", async () => {
    mockCreate.mockResolvedValue({} as never);
    await logAudit({
      ...base,
      targetId: "event_5",
      targetType: "EVENT",
      targetLabel: "Summer Gala",
      ip: "1.2.3.4",
    });
    const call = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.targetId).toBe("event_5");
    expect(call.data.targetType).toBe("EVENT");
    expect(call.data.targetLabel).toBe("Summer Gala");
    expect(call.data.ip).toBe("1.2.3.4");
  });

  it("swallows database errors silently", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection lost"));
    await expect(logAudit(base)).resolves.not.toThrow();
  });

  it("does not throw for every recognised AuditAction type", async () => {
    mockCreate.mockResolvedValue({} as never);
    const actions = [
      "USER_SUSPENDED", "USER_BANNED", "USER_ACTIVATED", "USER_SESSION_REVOKED",
      "EVENT_DELETED", "PLAN_CHANGED", "ADMIN_ACTION",
    ] as const;
    for (const action of actions) {
      await expect(logAudit({ ...base, action })).resolves.not.toThrow();
    }
    expect(mockCreate).toHaveBeenCalledTimes(actions.length);
  });
});
