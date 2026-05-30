import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/snippe/webhook/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    processedWebhookEvent: {
      create:     vi.fn(),
      update:     vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    user: { update: vi.fn() },
    payment: {
      findFirst:  vi.fn(),
      updateMany: vi.fn(),
      update:     vi.fn(),
    },
    guest: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/snippe", () => ({
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
  disburseMobileMoney: vi.fn().mockResolvedValue({ disbursementId: "disb_123" }),
  disburseBank: vi.fn().mockResolvedValue({ disbursementId: "disb_456" }),
  PLATFORM_FEE_RATE: 0.04,
}));

vi.mock("@/lib/email", () => ({
  sendRSVPConfirmation: vi.fn().mockResolvedValue(undefined),
  sendHostNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/snippe";

const mockPrisma = prisma as unknown as {
  processedWebhookEvent: {
    create:     ReturnType<typeof vi.fn>;
    update:     ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  user: { update: ReturnType<typeof vi.fn> };
  payment: {
    findFirst:  ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    update:     ReturnType<typeof vi.fn>;
  };
  guest: { update: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockPayment = {
  id: "payment_1",
  status: "PENDING",
  amount: 10000,
  guest: { id: "guest_1", name: "Jane", email: "jane@example.com", phone: null, qrToken: "qr_1" },
  event: {
    id: "event_1", title: "Party", date: new Date(), location: "Venue",
    host: {
      id: "host_1", name: "Host", email: "host@example.com",
      payoutMethods: [{
        type: "mobile_money", network: "mpesa", phone: "0712345678",
      }],
    },
  },
};

function makeWebhookRequest(payload: object) {
  const body = JSON.stringify(payload);
  return new Request("http://localhost/api/snippe/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-snippe-signature": "valid_sig" },
    body,
  });
}

const successPayload = {
  event: "payment.completed",
  data: { transaction_id: "txn_001", status: "success", amount: 10000, reference: "guest_1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyWebhookSignature).mockReturnValue(true);
  mockPrisma.processedWebhookEvent.create.mockResolvedValue({});
  mockPrisma.processedWebhookEvent.update.mockResolvedValue({});
  mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null);
  mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);
  mockPrisma.$transaction.mockResolvedValue([]);
  mockPrisma.payment.update.mockResolvedValue({});
});

describe("POST /api/snippe/webhook", () => {
  it("returns 401 for invalid signature", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);
    const res = await POST(makeWebhookRequest(successPayload));
    expect(res.status).toBe(401);
  });

  it("returns 200 and acknowledges non-payment events", async () => {
    const res = await POST(makeWebhookRequest({ event: "payment.pending", data: {} }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it("processes a successful payment", async () => {
    const res = await POST(makeWebhookRequest(successPayload));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("is idempotent — skips duplicate transactionId", async () => {
    // Simulate unique constraint violation (already processed)
    mockPrisma.processedWebhookEvent.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" })
    );

    const res = await POST(makeWebhookRequest(successPayload));
    expect(res.status).toBe(200);
    // Should return early without processing
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("handles failed payment status", async () => {
    mockPrisma.payment.updateMany.mockResolvedValue({});
    const failPayload = {
      event: "payment.completed",
      data: { transaction_id: "txn_fail", status: "failed", amount: 0, reference: "guest_1" },
    };
    const res = await POST(makeWebhookRequest(failPayload));
    expect(res.status).toBe(200);
    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "FAILED" } })
    );
  });

  it("upgrades user plan for subscription payment", async () => {
    // userId must not contain underscores — reference is split by "_"
    // format: sub_{userId}_{PLAN}_{ts}
    mockPrisma.user.update.mockResolvedValue({});
    const subPayload = {
      event: "payment.completed",
      data: {
        transaction_id: "txn_sub_001",
        status: "success",
        amount: 25000,
        reference: "sub_clh5abc123_PRO_1234567890",
      },
    };
    const res = await POST(makeWebhookRequest(subPayload));
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clh5abc123" },
        data: expect.objectContaining({ plan: "PRO" }),
      })
    );
  });

  it("does not upgrade plan for invalid plan name in reference", async () => {
    const subPayload = {
      event: "payment.completed",
      data: {
        transaction_id: "txn_sub_002",
        status: "success",
        amount: 999,
        reference: "sub_clh5abc123_INVALID_1234567890",
      },
    };
    await POST(makeWebhookRequest(subPayload));
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("activates annual plan and sets planInterval to ANNUAL", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    const annualPayload = {
      event: "payment.completed",
      data: {
        transaction_id: "txn_annual_001",
        status: "success",
        amount: 400000,
        reference: "sub_clh5abc999_PRO_ANNUAL_1234567890",
      },
    };
    const res = await POST(makeWebhookRequest(annualPayload));
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clh5abc999" },
        data:  expect.objectContaining({ plan: "PRO", planInterval: "ANNUAL" }),
      })
    );
  });

  it("grants an event credit for credit_ reference", async () => {
    mockPrisma.user.update.mockResolvedValue({});
    const creditPayload = {
      event: "payment.completed",
      data: {
        transaction_id: "txn_credit_001",
        status: "success",
        amount: 10000,
        reference: "credit_clh5abc777_1234567890",
      },
    };
    const res = await POST(makeWebhookRequest(creditPayload));
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clh5abc777" },
        data:  { eventCredits: { increment: 1 } },
      })
    );
  });
});
