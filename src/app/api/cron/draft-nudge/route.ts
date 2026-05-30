import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDraftNudge } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Narrow window: events created between 24h and 48h ago
    // Running hourly ensures each event is nudged exactly once in that window
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const draftEvents = await prisma.event.findMany({
      where: {
        status: "DRAFT",
        isTemplate: false,
        createdAt: { gte: fortyEightHoursAgo, lte: twentyFourHoursAgo },
      },
      include: { host: { select: { name: true, email: true } } },
    });

    // Group by host so one email lists all their drafts
    const byHost = new Map<string, { name: string; email: string; events: { id: string; title: string }[] }>();
    for (const ev of draftEvents) {
      if (!byHost.has(ev.hostId)) {
        byHost.set(ev.hostId, { name: ev.host.name, email: ev.host.email, events: [] });
      }
      byHost.get(ev.hostId)!.events.push({ id: ev.id, title: ev.title });
    }

    let sent = 0;
    for (const { name, email, events } of byHost.values()) {
      try {
        await sendDraftNudge({ to: email, hostName: name, events });
        sent++;
      } catch (err) {
        console.error(`[DraftNudge] Failed for ${email}:`, err);
      }
    }

    console.log("[Cron/draft-nudge]", { nudged: sent, drafts: draftEvents.length });
    return NextResponse.json({ ok: true, nudged: sent, drafts: draftEvents.length });
  } catch (error) {
    console.error("[Cron/draft-nudge] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
