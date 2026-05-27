import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildICS } from "@/lib/calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrToken: string }> }
) {
  try {
    const { qrToken } = await params;

    const guest = await prisma.guest.findUnique({
      where: { qrToken },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            endDate: true,
            location: true,
            address: true,
            description: true,
          },
        },
      },
    });

    if (!guest) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const e = guest.event;
    const start = new Date(e.date);
    // Default end = start + 2 hours if no endDate
    const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const location = [e.location, e.address].filter(Boolean).join(", ");

    const ics = buildICS({
      uid: `${e.id}@eventcraft`,
      title: e.title,
      start,
      end,
      location: location || undefined,
      description: e.description || undefined,
    });

    const filename = `${e.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Calendar ICS error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
