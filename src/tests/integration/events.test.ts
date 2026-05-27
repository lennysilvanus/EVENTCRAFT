import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/events/route";
import { signToken } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    event: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    blockedToken: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  event: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  blockedToken: { findUnique: ReturnType<typeof vi.fn> };
};

const authToken = signToken({ userId: "user_1", email: "host@example.com", role: "USER", name: "Host", status: "ACTIVE" });

function makeRequest(body: object) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cookie": `token=${authToken}`,
    },
    body: JSON.stringify(body),
  });
}

const validEvent = {
  title: "Tech Conference 2026",
  description: "A full day of tech talks and workshops",
  date: new Date("2026-10-01T09:00:00Z").toISOString(),
  location: "Dar es Salaam Convention Centre",
  category: "CONFERENCE",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ plan: "FREE", planExpiresAt: null, status: "ACTIVE" });
  mockPrisma.blockedToken.findUnique.mockResolvedValue(null);
  mockPrisma.event.count.mockResolvedValue(0);
  mockPrisma.event.create.mockResolvedValue({
    id: "event_1",
    ...validEvent,
    status: "DRAFT",
    hostId: "user_1",
    tiers: [],
  });
});

describe("POST /api/events", () => {
  it("creates an event and returns 201", async () => {
    const res = await POST(makeRequest(validEvent));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe("Tech Conference 2026");
  });

  it("returns 401 for unauthenticated requests", async () => {
    const req = new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEvent),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeRequest({ ...validEvent, title: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is too short", async () => {
    const res = await POST(makeRequest({ ...validEvent, description: "Short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when location is missing", async () => {
    const res = await POST(makeRequest({ ...validEvent, location: "" }));
    expect(res.status).toBe(400);
  });

  it("enforces FREE plan event limit of 3", async () => {
    mockPrisma.event.count.mockResolvedValue(3); // already at limit
    const res = await POST(makeRequest(validEvent));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PLAN_LIMIT_EVENTS");
  });

  it("allows unlimited events on PRO plan", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    mockPrisma.user.findUnique.mockResolvedValue({ plan: "PRO", planExpiresAt: future, status: "ACTIVE" });
    mockPrisma.event.count.mockResolvedValue(50); // well above FREE limit
    const res = await POST(makeRequest(validEvent));
    expect(res.status).toBe(201);
  });

  it("enforces event limit when PRO plan is expired", async () => {
    const past = new Date(Date.now() - 1000);
    mockPrisma.user.findUnique.mockResolvedValue({ plan: "PRO", planExpiresAt: past, status: "ACTIVE" });
    mockPrisma.event.count.mockResolvedValue(3);
    const res = await POST(makeRequest(validEvent));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("PLAN_LIMIT_EVENTS");
  });
});

describe("GET /api/events", () => {
  it("returns events for authenticated user", async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      { id: "event_1", title: "My Event", guests: [], _count: { guests: 0 } },
    ]);

    const req = new Request("http://localhost/api/events", {
      headers: { "cookie": `token=${authToken}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const req = new Request("http://localhost/api/events");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
