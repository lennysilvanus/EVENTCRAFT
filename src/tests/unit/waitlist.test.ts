import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event:  { findUnique: vi.fn() },
    guest:  { count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({
  sendRSVPConfirmation: vi.fn().mockResolvedValue(undefined),
}));

import { promoteFromWaitlist } from "@/lib/waitlist";
import { prisma } from "@/lib/prisma";

const mockEvent = vi.mocked(prisma.event.findUnique);
const mockCount = vi.mocked(prisma.guest.count);
const mockFirst = vi.mocked(prisma.guest.findFirst);
const mockUpdate = vi.mocked(prisma.guest.update);

const future = new Date(Date.now() + 86400_000);

beforeEach(() => vi.clearAllMocks());

describe("promoteFromWaitlist", () => {
  it("does nothing when event has no maxGuests", async () => {
    mockEvent.mockResolvedValue({ maxGuests: null, title: "E", date: future, location: "L", host: { name: "H" } } as never);
    await promoteFromWaitlist("event_1");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does nothing when confirmed count is at capacity", async () => {
    mockEvent.mockResolvedValue({ maxGuests: 10, title: "E", date: future, location: "L", host: { name: "H" } } as never);
    mockCount.mockResolvedValue(10);
    await promoteFromWaitlist("event_1");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does nothing when no waitlisted guests", async () => {
    mockEvent.mockResolvedValue({ maxGuests: 10, title: "E", date: future, location: "L", host: { name: "H" } } as never);
    mockCount.mockResolvedValue(9);
    mockFirst.mockResolvedValue(null);
    await promoteFromWaitlist("event_1");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("promotes the first waitlisted guest when there is capacity", async () => {
    const guest = { id: "g1", name: "Jane", email: "jane@example.com", qrToken: "qr1" };
    mockEvent.mockResolvedValue({ maxGuests: 10, title: "Party", date: future, location: "Venue", host: { name: "Host" } } as never);
    mockCount.mockResolvedValue(9);
    mockFirst.mockResolvedValue(guest as never);
    mockUpdate.mockResolvedValue({ ...guest, status: "CONFIRMED" } as never);

    await promoteFromWaitlist("event_1");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "g1" }, data: { status: "CONFIRMED" } })
    );
  });
});
