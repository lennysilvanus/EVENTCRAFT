import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/checkin/[token]/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guest: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
const mockFindFirst = vi.mocked(prisma.guest.findFirst);
const mockUpdate    = vi.mocked(prisma.guest.update);

function makeRequest(token: string) {
  return new Request(`http://localhost/api/checkin/${token}`, { method: "POST" });
}

const baseGuest = {
  id: "g1", name: "Jane", status: "CONFIRMED",
  checkedIn: false, checkedInAt: null, plusOne: false,
  qrToken: "tok123",
  event: { title: "Party", date: new Date(), location: "Venue", coverImage: null, coverColor: null, ticketPrice: null },
  tier:    null,
  payment: null,
};

const params = Promise.resolve({ token: "tok123" });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/checkin/[token]", () => {
  it("checks in a confirmed guest on a free event and returns 200", async () => {
    mockFindFirst.mockResolvedValue(baseGuest as never);
    mockUpdate.mockResolvedValue({ ...baseGuest, checkedIn: true } as never);

    const res = await POST(makeRequest("tok123"), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/success/i);
  });

  it("returns 409 when guest is already checked in", async () => {
    mockFindFirst.mockResolvedValue({ ...baseGuest, checkedIn: true } as never);
    const res = await POST(makeRequest("tok123"), { params });
    expect(res.status).toBe(409);
  });

  it("returns 403 when guest declined", async () => {
    mockFindFirst.mockResolvedValue({ ...baseGuest, status: "DECLINED" } as never);
    const res = await POST(makeRequest("tok123"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown QR token", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest("invalid"), { params: Promise.resolve({ token: "invalid" }) });
    expect(res.status).toBe(404);
  });

  it("returns 402 when ticket is paid but payment is not completed", async () => {
    const paidGuest = {
      ...baseGuest,
      tier:    { price: 25000 },
      payment: { status: "PENDING" },
    };
    mockFindFirst.mockResolvedValue(paidGuest as never);
    const res = await POST(makeRequest("tok123"), { params });
    expect(res.status).toBe(402);
  });

  it("allows check-in when paid ticket has COMPLETED payment", async () => {
    const paidGuest = {
      ...baseGuest,
      tier:    { price: 25000 },
      payment: { status: "COMPLETED" },
    };
    mockFindFirst.mockResolvedValue(paidGuest as never);
    mockUpdate.mockResolvedValue({ ...paidGuest, checkedIn: true } as never);
    const res = await POST(makeRequest("tok123"), { params });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/checkin/[token]", () => {
  it("returns guest + event data for a valid token", async () => {
    mockFindFirst.mockResolvedValue(baseGuest as never);
    const req = new Request("http://localhost/api/checkin/tok123");
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Jane");
  });

  it("returns 404 for an unknown token", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = new Request("http://localhost/api/checkin/bad");
    const res = await GET(req, { params: Promise.resolve({ token: "bad" }) });
    expect(res.status).toBe(404);
  });
});
