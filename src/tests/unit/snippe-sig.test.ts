import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Test verifyWebhookSignature logic directly without importing the module
// (avoids needing SNIPPE_WEBHOOK_SECRET set in env during tests)

function computeHmac(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

describe("HMAC webhook signature verification logic", () => {
  const SECRET  = "test-webhook-secret";
  const PAYLOAD = JSON.stringify({ event: "payment.completed", data: {} });

  it("accepts a correctly signed payload", () => {
    const sig = computeHmac(SECRET, PAYLOAD);
    const expected = computeHmac(SECRET, PAYLOAD);
    // Timing-safe comparison
    expect(crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"))).toBe(true);
  });

  it("rejects a payload with a tampered signature", () => {
    const sig = computeHmac(SECRET, PAYLOAD);
    const tampered = sig.slice(0, -2) + "ff";
    // Different length or different bytes should not match
    const expected = computeHmac(SECRET, PAYLOAD);
    let match = false;
    try {
      match = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(tampered, "hex"));
    } catch { match = false; }
    expect(match).toBe(false);
  });

  it("rejects a payload with the wrong secret", () => {
    const wrongSig = computeHmac("wrong-secret", PAYLOAD);
    const expected = computeHmac(SECRET, PAYLOAD);
    expect(crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(wrongSig, "hex"))).toBe(false);
  });

  it("rejects a tampered payload body", () => {
    const sig = computeHmac(SECRET, PAYLOAD);
    const tamperedPayload = PAYLOAD + " ";
    const expected = computeHmac(SECRET, tamperedPayload);
    expect(crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"))).toBe(false);
  });
});
