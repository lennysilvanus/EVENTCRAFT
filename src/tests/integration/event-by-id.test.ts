import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/events/[id]/route";
import { signToken } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }),
    },
    event: {
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
    ticketTier: {
      deleteMany:  vi.fn(),
      createMany:  vi.fn(),
    },
    blockedToken: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        event:      { update: vi.fn().mockResolvedValue(baseEvent) },
        ticketTier: { deleteMany: vi.fn(), createMany: vi.fn() },
      })
    ),
  },
}));

vi.mock("@/lib/audit",      () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: vi.fn().mockReturnValue("1.2.3.4") }));

import { prisma } from "@/lib/prisma";

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockFindFirst      = vi.mocked(prisma.event.findFirst);
const mockFindUnique     = vi.mocked(prisma.event.findUnique);
const mockDelete         = vi.mocked(prisma.event.delete);
const mockTx             = vi.mocked(prisma.$transaction);

const baseEvent = {
  id: "event_1",
  title: "Tech Summit",
  description: "A great conference",
  date: new Date("2026-10-01T09:00:00Z"),
  location: "Nairobi",
  status: "DRAFT",
  hostId: "user_1",
  guests: [],
  inviteLinks: [],
  tiers: [],
  media: [],
  host: { id: "user_1", name: "Host", email: "host@example.com" },
};

const userToken  = signToken({ userId: "user_1", email: "host@example.com", role: "USER",  name: "Host",  status: "ACTIVE" });
const adminToken = signToken({ userId: "admin_1", email: "admin@example.com", role: "ADMIN", name: "Admin", status: "ACTIVE" });

const params = Promise.resolve({ id: "event_1" });

function makeRequest(method: string, token: string, body?: object) {
  return new Request(`http://localhost/api/events/event_1`, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `token=${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.blockedToken.findUnique).mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue({ status: "ACTIVE" } as never);
  mockFindFirst.mockResolvedValue(baseEvent as never);
  mockFindUnique.mockResolvedValue(baseEvent as never);
  mockTx.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      event:      { update: vi.fn().mockResolvedValue(baseEvent) },
      ticketTier: { deleteMany: vi.fn(), createMany: vi.fn() },
    })
  );
});

// ─── GET /api/events/[id] ────────────────────────────────────────────────────

describe("GET /api/events/[id]", () => {
  it("returns 200 with event data for the owner", async () => {
    const res = await GET(makeRequest("GET", userToken), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe("Tech Summit");
  });

  it("returns 401 for unauthenticated requests", async () => {
    const req = new Request("http://localhost/api/events/event_1");
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the event does not belong to the requester", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await GET(makeRequest("GET", userToken), { params });
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/events/[id] ────────────────────────────────────────────────────

describe("PUT /api/events/[id]", () => {
  it("returns 200 with updated event on a valid request", async () => {
    const res = await PUT(
      makeRequest("PUT", userToken, { title: "Updated Title" }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const req = new Request("http://localhost/api/events/event_1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    const res = await PUT(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when event is not found for the requester", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await PUT(
      makeRequest("PUT", userToken, { title: "x" }),
      { params }
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/events/[id] ─────────────────────────────────────────────────

describe("DELETE /api/events/[id]", () => {
  it("returns 200 and deletes the event for the owner", async () => {
    mockDelete.mockResolvedValue({} as never);

    const res = await DELETE(makeRequest("DELETE", userToken), { params });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "event_1" } });
  });

  it("returns 401 for unauthenticated requests", async () => {
    const req = new Request("http://localhost/api/events/event_1", { method: "DELETE" });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the event is not found for a regular user", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", userToken), { params });
    expect(res.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("allows ADMIN to delete any event regardless of ownership", async () => {
    mockDelete.mockResolvedValue({} as never);
    const otherEvent = { ...baseEvent, hostId: "other_user" };
    mockFindFirst.mockResolvedValue(otherEvent as never);

    const res = await DELETE(makeRequest("DELETE", adminToken), { params });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "event_1" } });
  });
});
