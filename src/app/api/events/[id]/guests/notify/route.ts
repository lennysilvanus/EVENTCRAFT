import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { sendBulkGuestReminder } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({
      where: { id, hostId: user.userId },
      include: { host: { select: { name: true } } },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await request.json();
    const message: string | undefined = body.message || undefined;
    const filter: string = body.filter || "CONFIRMED"; // CONFIRMED | ALL

    const guests = await prisma.guest.findMany({
      where: {
        eventId: id,
        email: { not: null },
        ...(filter !== "ALL" && { status: filter }),
      },
    });

    const emailGuests = guests.filter(g => g.email);
    let sent = 0;

    await Promise.allSettled(
      emailGuests.map(async g => {
        try {
          await sendBulkGuestReminder({
            to: g.email!,
            guestName: g.name,
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location,
            hostName: event.host.name,
            message,
          });
          sent++;
        } catch {
          // continue sending to others if one fails
        }
      })
    );

    return NextResponse.json({ data: { sent, total: emailGuests.length } });
  } catch (error) {
    console.error("POST notify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
