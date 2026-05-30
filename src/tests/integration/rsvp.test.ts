import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/rsvp/route";

// vi.hoisted lets us reference these inside the vi.mock factory
// (factories are hoisted to the top of the file, so normal vars aren't available)
const m = vi.hoisted(() => ({
  eventFindFirst:  vi.fn(),
  guestCount:      vi.fn(),
  guestFindFirst:  vi.fn(),
  guestCreate:     vi.fn(),
  guestUpdate:     vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findFirst: m.eventFindFirst },
    guest: {
      count:     m.guestCount,
      findFirst: m.guestFindFirst,
      create:    m.guestCreate,
      update:    m.guestUpdate,
    },
    // $transaction runs the callback with the same mock Prisma client
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        guest: {
          count:     m.guestCount,
          findFirst: m.guestFindFirst,
          create:    m.guestCreate,
          update:    m.guestUpdate,
        },
      })
    ),
  },
}));

vi.mock("@/lib/email", () => ({
  sendRSVPConfirmation: vi.fn().mockResolvedValue(undefined),
  sendHostNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/waitlist", () => ({
  promoteFromWaitlist: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/retry", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const mockEvent = {
  id: "event_1",
  title: "Test Event",
  date: future,
  location: "Test Venue",
  maxGuests: null,
  host: { name: "Host", email: "host@example.com", plan: "FREE", planExpiresAt: null, role: "USER" },
};

const mockGuest = {
  id: "guest_1", name: "Jane Doe", email: "jane@example.com",
  phone: null, status: "CONFIRMED", qrToken: "qr_abc123", plusOne: false,
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
  m.eventFindFirst.mockResolvedValue(mockEvent);
  m.guestCount.mockResolvedValue(0);
  m.guestFindFirst.mockResolvedValue(null);
  m.guestCreate.mockResolvedValue(mockGuest);
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
    m.guestCreate.mockResolvedValue({ ...mockGuest, status: "DECLINED" });
    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane Doe", email: "jane@example.com",
      status: "DECLINED", plusOne: false,
    }));
    expect(res.status).toBe(201);
  });

  it("returns 404 when event does not exist", async () => {
    m.eventFindFirst.mockResolvedValue(null);
    const res = await POST(makeRequest({
      eventId: "nonexistent", name: "Jane", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(404);
  });

  it("puts guest on WAITLISTED when event is full", async () => {
    const fullEvent = { ...mockEvent, maxGuests: 10 };
    m.eventFindFirst.mockResolvedValue(fullEvent);
    m.guestCount.mockResolvedValue(10); // confirmed count == maxGuests
    m.guestCreate.mockResolvedValue({ ...mockGuest, status: "WAITLISTED" });

    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane Doe", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.waitlisted).toBe(true);
  });

  it("updates existing guest when same email RSVPs again", async () => {
    m.guestFindFirst.mockResolvedValue({ id: "existing_guest", status: "PENDING" });
    m.guestUpdate.mockResolvedValue({ ...mockGuest, status: "CONFIRMED" });

    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane Doe", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(201);
    expect(m.guestUpdate).toHaveBeenCalled();
    expect(m.guestCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when host's FREE guest limit is reached on confirmed RSVP", async () => {
    m.guestCount.mockResolvedValue(50); // FREE plan limit
    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane", email: "jane@example.com",
      status: "CONFIRMED", plusOne: false,
    }));
    expect(res.status).toBe(403);
  });

  it("does not check guest limit for DECLINED RSVPs", async () => {
    m.guestCount.mockResolvedValue(50);
    m.guestCreate.mockResolvedValue({ ...mockGuest, status: "DECLINED" });

    const res = await POST(makeRequest({
      eventId: "event_1", name: "Jane", email: "jane@example.com",
      status: "DECLINED", plusOne: false,
    }));
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
