import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { z } from "zod";
import { sendGuestInvite } from "@/lib/email";

const importSchema = z.object({
  guests: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")).nullable(),
    phone: z.string().optional().nullable(),
  })).min(1).max(500),
  sendInvites: z.boolean().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { guests: guestRows, sendInvites } = parsed.data;

    // Skip rows where email already exists in this event
    const existingEmails = new Set(
      (await prisma.guest.findMany({ where: { eventId: id, email: { not: null } }, select: { email: true } }))
        .map(g => g.email?.toLowerCase())
    );

    const toCreate = guestRows.filter(g =>
      !g.email || !existingEmails.has(g.email.toLowerCase())
    );

    const created = await prisma.$transaction(
      toCreate.map(g =>
        prisma.guest.create({
          data: {
            name: g.name.trim(),
            email: g.email?.trim() || null,
            phone: g.phone?.trim() || null,
            eventId: id,
            status: "PENDING",
            plusOne: false,
          },
        })
      )
    );

    if (sendInvites) {
      for (const guest of created) {
        if (guest.email) {
          sendGuestInvite({
            to: guest.email,
            guestName: guest.name,
            hostName: event.host.name,
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location,
            inviteText: event.inviteText,
            inviteToken: event.inviteToken,
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      data: created,
      message: `Imported ${created.length} guest${created.length !== 1 ? "s" : ""}${guestRows.length - toCreate.length > 0 ? `, skipped ${guestRows.length - toCreate.length} duplicates` : ""}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Import guests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
