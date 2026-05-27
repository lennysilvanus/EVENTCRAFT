import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "@/lib/auth";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password to a non-empty string", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("secret123");
  });

  it("produces a different hash each time (salt)", async () => {
    const h1 = await hashPassword("secret123");
    const h2 = await hashPassword("secret123");
    expect(h1).not.toBe(h2);
  });

  it("verifies the correct password against its hash", async () => {
    const hash = await hashPassword("myP@ssw0rd");
    expect(await verifyPassword("myP@ssw0rd", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("myP@ssw0rd");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("rejects an empty string as password", async () => {
    const hash = await hashPassword("realpassword");
    expect(await verifyPassword("", hash)).toBe(false);
  });
});

describe("signToken / verifyToken", () => {
  const payload = { userId: "user_123", email: "test@example.com", role: "USER", name: "Test User", status: "ACTIVE" };

  it("signs and verifies a valid token", () => {
    const token = signToken(payload);
    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user_123");
    expect(result?.email).toBe("test@example.com");
    expect(result?.role).toBe("USER");
    expect(result?.name).toBe("Test User");
  });

  it("returns null for a tampered token", () => {
    const token = signToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(verifyToken(tampered)).toBeNull();
  });

  it("returns null for a completely invalid string", () => {
    expect(verifyToken("not.a.jwt")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(verifyToken("")).toBeNull();
  });

  it("preserves all payload fields through sign/verify", () => {
    const token = signToken(payload);
    const result = verifyToken(token);
    expect(result?.userId).toBe(payload.userId);
    expect(result?.email).toBe(payload.email);
    expect(result?.role).toBe(payload.role);
    expect(result?.name).toBe(payload.name);
  });
});
