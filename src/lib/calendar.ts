function fmt(d: Date): string {
  return d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  uid?: string;
}

export function buildGoogleCalendarUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${fmt(e.start)}/${fmt(e.end)}`,
  });
  if (e.location) p.set("location", e.location);
  if (e.description) p.set("details", e.description);
  return `https://www.google.com/calendar/render?${p}`;
}

export function buildOutlookUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    path: "/calendar/action/compose",
    rru: "addevent",
  });
  if (e.location) p.set("location", e.location);
  if (e.description) p.set("body", e.description);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`;
}

export function buildICS(e: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventCraft//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid ?? `${Date.now()}@eventcraft`}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(e.start)}`,
    `DTEND:${fmt(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
  ];
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
