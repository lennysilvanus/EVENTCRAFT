import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendRSVPConfirmation, sendHostNotification } from "@/lib/email";
import { getPlanLimits } from "@/lib/plan-limits";

const rsvpSchema = z.object({
  eventId: z.string(),
  tierId: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(["CONFIRMED", "DECLINED"]),
  plusOne: z.boolean().default(false),
  dietaryReqs: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { eventId, tierId, name, email, phone, status, plusOne, dietaryReqs, message } = parsed.data;

    const event = await prisma.event.findFirst({
      where: { id: eventId, status: "PUBLISHED" },
      include: { host: { select: { name: true, email: true, plan: true, planExpiresAt: true } } },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Enforce host's plan guest limit (skip if declining)
    if (status === "CONFIRMED") {
      const limits = getPlanLimits(event.host.plan, event.host.planExpiresAt);
      if (limits.guests !== Infinity) {
        const guestCount = await prisma.guest.count({ where: { eventId } });
        if (guestCount >= limits.guests) {
          return NextResponse.json({ error: "This event is no longer accepting RSVPs." }, { status: 403 });
        }
      }
    }

    // Waitlist logic: if confirmed + event full → add to waitlist instead
    let finalStatus: string = status;
    let waitlisted = false;

    if (status === "CONFIRMED" && event.maxGuests) {
      const confirmedCount = await prisma.guest.count({ where: { eventId, status: "CONFIRMED" } });
      if (confirmedCount >= event.maxGuests) {
        finalStatus = "WAITLISTED";
        waitlisted = true;
      }
    }

    const existing = email
      ? await prisma.guest.findFirst({ where: { eventId, email } })
      : null;

    let guest;
    if (existing) {
      guest = await prisma.guest.update({
        where: { id: existing.id },
        data: { status: finalStatus, name, phone: phone || null, plusOne, dietaryReqs: dietaryReqs || null, message: message || null },
      });
    } else {
      guest = await prisma.guest.create({
        data: {
          eventId, name,
          email: email || null,
          phone: phone || null,
          status: finalStatus,
          plusOne,
          dietaryReqs: dietaryReqs || null,
          message: message || null,
          ...(tierId && { tierId }),
        },
      });
    }

    if (email && !waitlisted) {
      sendRSVPConfirmation({
        to: email, guestName: name, eventTitle: event.title,
        eventDate: event.date, eventLocation: event.location,
        status: "CONFIRMED", qrToken: guest.qrToken, hostName: event.host.name,
      }).catch(() => {});
    }

    sendHostNotification({
      to: event.host.email, hostName: event.host.name,
      guestName: name, guestEmail: email || null, guestPhone: phone || null,
      eventTitle: event.title, status: waitlisted ? "WAITLISTED" : status, eventId,
    }).catch(() => {});

    return NextResponse.json({ data: guest, waitlisted }, { status: 201 });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
