import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEventReminder } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

type ReminderWindow = "7d" | "1d" | "2h";

// Time windows: each defines an exclusive range (±30 min around the target)
// so a cron running every hour only picks up each event once per window.
const WINDOWS: { key: ReminderWindow; msFromNow: number; toleranceMs: number }[] = [
  { key: "7d", msFromNow: 7 * 24 * 60 * 60 * 1000, toleranceMs: 30 * 60 * 1000 },
  { key: "1d", msFromNow: 24 * 60 * 60 * 1000,      toleranceMs: 30 * 60 * 1000 },
  { key: "2h", msFromNow: 2 * 60 * 60 * 1000,       toleranceMs: 20 * 60 * 1000 },
];

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: Record<string, number> = { "7d": 0, "1d": 0, "2h": 0 };

  for (const window of WINDOWS) {
    const targetTime = new Date(now.getTime() + window.msFromNow);
    const from = new Date(targetTime.getTime() - window.toleranceMs);
    const to = new Date(targetTime.getTime() + window.toleranceMs);

    const events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        isTemplate: false,
        date: { gte: from, lte: to },
      },
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        inviteToken: true,
        guests: {
          where: { status: "CONFIRMED", email: { not: null } },
          select: { id: true, name: true, email: true, qrToken: true },
        },
      },
    });

    for (const event of events) {
      for (const guest of event.guests) {
        if (!guest.email) continue;
        try {
          await sendEventReminder({
            to: guest.email,
            guestName: guest.name,
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location,
            inviteToken: event.inviteToken,
            qrToken: guest.qrToken ?? null,
            window: window.key,
          });
          results[window.key]++;
        } catch (err) {
          console.error(`[Reminder ${window.key}] Failed for guest ${guest.id}:`, err);
        }
      }
    }
  }

  console.log("[Cron/reminders]", results);
  return NextResponse.json({ ok: true, sent: results });
}
