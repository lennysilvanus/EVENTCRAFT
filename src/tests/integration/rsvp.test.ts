import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/rsvp/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    guest: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendRSVPConfirmation: vi.fn().mockResolvedValue(undefined),
  sendHostNotification: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  event: { findFirst: ReturnType<typeof vi.fn> };
  guest: {
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const mockEvent = {
  id: "event_1",
  title: "Test Event",
  date: future,
  location: "Test Venue",
  maxGuests: null,
  host: { name: "Host", email: "host@example.com", plan: "FREE", planExpiresAt: null },
};

const mockGuest = {
  id: "guest_1",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: null,
  status: "CONFIRMED",
  qrToken: "qr_abc123",
  plusOne: false,
};

function makeRequest(body: object) {
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.event.findFirst.mockResolvedValue(mockEvent);
  mockPrisma.guest.count.mockResolvedValue(0);
  mockPrisma.guest.findFirst.mockResolvedValue(null);
  mockPrisma.guest.create.mockResolvedValue(mockGuest);
});

describe("POST /api/rsvp", () => {
  it("creates a confirmed RSVP and returns 201", async () => {
    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane Doe", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.status).toBe("CONFIRMED");
    expect(body.waitlisted).toBe(false);
  });

  it("creates a declined RSVP", async () => {
    mockPrisma.guest.create.mockResolvedValue({ ...mockGuest, status: "DECLINED" });
    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane Doe", email: "jane@example.com",
      status: "DECLINED", plusOne: false,
    }));
    expect(res.status).toBe(201);
  });

  it("returns 404 when event does not exist", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({
      eventId: "nonexistent", name: "Jane", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(404);
  });

  it("puts guest on WAITLISTED when event is full", async () => {
    const fullEvent = { ...mockEvent, maxGuests: 10 };
    mockPrisma.event.findFirst.mockResolvedValue(fullEvent);
    mockPrisma.guest.count.mockResolvedValue(10); // confirmed count == maxGuests
    mockPrisma.guest.create.mockResolvedValue({ ...mockGuest, status: "WAITLISTED" });

    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane Doe", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.waitlisted).toBe(true);
  });

  it("updates existing guest when same email RSVPs again", async () => {
    mockPrisma.guest.findFirst.mockResolvedValue({ id: "existing_guest" });
    mockPrisma.guest.update.mockResolvedValue({ ...mockGuest, status: "CONFIRMED" });

    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane Doe", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(201);
    expect(mockPrisma.guest.update).toHaveBeenCalled();
    expect(mockPrisma.guest.create).not.toHaveBeenCalled();
  });

  it("returns 403 when host's FREE guest limit is reached on confirmed RSVP", async () => {
    mockPrisma.guest.count.mockResolvedValue(50); // FREE plan limit
    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(403);
  });

  it("does not check guest limit for DECLINED RSVPs", async () => {
    mockPrisma.guest.count.mockResolvedValue(50);
    mockPrisma.guest.create.mockResolvedValue({ ...mockGuest, status: "DECLINED" });

    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane", email: "jane@example.com",
      status: "DECLINED", plusOne: false,
    }));
    // Should not be blocked by guest limit for declines
    expect(res.status).toBe(201);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({
      eventId: "event_1", email: "jane@example.com", status: "CONFIRMED",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when status is invalid", async () => {
    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane", email: "jane@example.com", status: "MAYBE",
    }));
    expect(res.status).toBe(400);
  });
});
