import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl, buildOutlookUrl, buildICS } from "@/lib/calendar";

const event = {
  title: "Summer Party",
  start: new Date("2026-08-01T18:00:00Z"),
  end:   new Date("2026-08-01T22:00:00Z"),
  location: "Dar es Salaam",
  description: "Join us for fun",
  uid: "test-uid-123",
};

describe("buildGoogleCalendarUrl", () => {
  it("returns a Google Calendar URL", () => {
    const url = buildGoogleCalendarUrl(event);
    expect(url).toMatch(/^https:\/\/www\.google\.com\/calendar\/render/);
  });

  it("includes action=TEMPLATE", () => {
    const url = buildGoogleCalendarUrl(event);
    expect(url).toContain("action=TEMPLATE");
  });

  it("encodes the event title", () => {
    const url = buildGoogleCalendarUrl(event);
    // URLSearchParams encodes spaces as +
    expect(url).toContain("Summer+Party");
  });

  it("includes dates in YYYYMMDDTHHMMSSZ format", () => {
    const url = buildGoogleCalendarUrl(event);
    expect(url).toContain("20260801T180000Z");
    expect(url).toContain("20260801T220000Z");
  });

  it("includes location when provided", () => {
    const url = buildGoogleCalendarUrl(event);
    expect(url).toContain("Dar+es+Salaam");
  });

  it("omits location when not provided", () => {
    const url = buildGoogleCalendarUrl({ ...event, location: undefined });
    expect(url).not.toContain("location=");
  });
});

describe("buildOutlookUrl", () => {
  it("returns an Outlook live.com URL", () => {
    const url = buildOutlookUrl(event);
    expect(url).toMatch(/^https:\/\/outlook\.live\.com\/calendar/);
  });

  it("includes subject as the event title", () => {
    const url = buildOutlookUrl(event);
    expect(url).toContain("Summer+Party");
  });

  it("includes ISO start and end dates", () => {
    const url = buildOutlookUrl(event);
    expect(url).toContain(encodeURIComponent(event.start.toISOString()));
    expect(url).toContain(encodeURIComponent(event.end.toISOString()));
  });
});

describe("buildICS", () => {
  it("produces valid VCALENDAR wrapper", () => {
    const ics = buildICS(event);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("uses CRLF line endings", () => {
    const ics = buildICS(event);
    expect(ics).toContain("\r\n");
  });

  it("includes the event UID", () => {
    const ics = buildICS(event);
    expect(ics).toContain("UID:test-uid-123");
  });

  it("includes DTSTART and DTEND in UTC format", () => {
    const ics = buildICS(event);
    expect(ics).toContain("DTSTART:20260801T180000Z");
    expect(ics).toContain("DTEND:20260801T220000Z");
  });

  it("includes SUMMARY with the event title", () => {
    const ics = buildICS(event);
    expect(ics).toContain("SUMMARY:Summer Party");
  });

  it("escapes special characters in title", () => {
    const ics = buildICS({ ...event, title: "Party; Fun, Music\nDance" });
    expect(ics).toContain("SUMMARY:Party\\; Fun\\, Music\\nDance");
  });

  it("includes LOCATION when provided", () => {
    const ics = buildICS(event);
    expect(ics).toContain("LOCATION:Dar es Salaam");
  });

  it("omits LOCATION when not provided", () => {
    const ics = buildICS({ ...event, location: undefined });
    expect(ics).not.toContain("LOCATION:");
  });

  it("generates a fallback UID when none is provided", () => {
    const ics = buildICS({ ...event, uid: undefined });
    expect(ics).toMatch(/UID:.+@eventcraft/);
  });
});
