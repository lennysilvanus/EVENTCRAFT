import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    blockedToken: {
      create:     vi.fn(),
      findUnique: vi.fn(),
      delete:     vi.fn(),
      upsert:     vi.fn(),
    },
  },
}));

import { blockToken, isTokenBlocked, blockAllUserTokens, isUserBlocked } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const mockCreate     = vi.mocked(prisma.blockedToken.create);
const mockFindUnique = vi.mocked(prisma.blockedToken.findUnique);
const mockDelete     = vi.mocked(prisma.blockedToken.delete);
const mockUpsert     = vi.mocked(prisma.blockedToken.upsert);

beforeEach(() => vi.clearAllMocks());

// ─── blockToken ──────────────────────────────────────────────────────────────

describe("blockToken", () => {
  it("creates a blocked-token entry", async () => {
    mockCreate.mockResolvedValue({} as never);
    const exp = new Date(Date.now() + 3600_000);
    await blockToken("jti_abc", "user_1", exp);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { jti: "jti_abc", userId: "user_1", expiresAt: exp },
    });
  });

  it("silently ignores duplicate inserts (already blocked)", async () => {
    mockCreate.mockRejectedValue(new Error("Unique constraint failed"));
    await expect(blockToken("jti_dup", "user_1", new Date())).resolves.not.toThrow();
  });
});

// ─── isTokenBlocked ──────────────────────────────────────────────────────────

describe("isTokenBlocked", () => {
  it("returns false when no entry exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await isTokenBlocked("jti_missing")).toBe(false);
  });

  it("returns true when a non-expired entry exists", async () => {
    const future = new Date(Date.now() + 3600_000);
    mockFindUnique.mockResolvedValue({ jti: "jti_1", expiresAt: future } as never);
    expect(await isTokenBlocked("jti_1")).toBe(true);
  });

  it("returns false and deletes the entry when it has expired", async () => {
    const past = new Date(Date.now() - 1000);
    mockFindUnique.mockResolvedValue({ jti: "jti_exp", expiresAt: past } as never);
    mockDelete.mockResolvedValue({} as never);

    expect(await isTokenBlocked("jti_exp")).toBe(false);
    expect(mockDelete).toHaveBeenCalledWith({ where: { jti: "jti_exp" } });
  });

  it("still returns false even if the delete of the stale entry fails", async () => {
    const past = new Date(Date.now() - 1000);
    mockFindUnique.mockResolvedValue({ jti: "jti_exp2", expiresAt: past } as never);
    mockDelete.mockRejectedValue(new Error("DB error"));

    expect(await isTokenBlocked("jti_exp2")).toBe(false);
  });
});

// ─── blockAllUserTokens ──────────────────────────────────────────────────────

describe("blockAllUserTokens", () => {
  it("upserts a sentinel with jti = user_all_{userId}", async () => {
    mockUpsert.mockResolvedValue({} as never);
    await blockAllUserTokens("user_42");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jti: "user_all_user_42" },
        create: expect.objectContaining({ jti: "user_all_user_42", userId: "user_42" }),
      })
    );
  });
});

// ─── isUserBlocked ───────────────────────────────────────────────────────────

describe("isUserBlocked", () => {
  it("returns false when no sentinel exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await isUserBlocked("user_99")).toBe(false);
  });

  it("returns true when a non-expired sentinel exists", async () => {
    const future = new Date(Date.now() + 3600_000);
    mockFindUnique.mockResolvedValue({ jti: "user_all_user_99", expiresAt: future } as never);
    expect(await isUserBlocked("user_99")).toBe(true);
  });

  it("returns false and deletes when the sentinel has expired", async () => {
    const past = new Date(Date.now() - 1000);
    mockFindUnique.mockResolvedValue({ jti: "user_all_user_7", expiresAt: past } as never);
    mockDelete.mockResolvedValue({} as never);

    expect(await isUserBlocked("user_7")).toBe(false);
    expect(mockDelete).toHaveBeenCalledWith({ where: { jti: "user_all_user_7" } });
  });
});
