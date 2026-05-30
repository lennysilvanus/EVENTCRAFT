import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { sendRSVPConfirmation, sendHostNotification } from "@/lib/email";
import { getPlanLimits } from "@/lib/plan-limits";
import { promoteFromWaitlist } from "@/lib/waitlist";
import { withRetry } from "@/lib/retry";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

const rsvpSchema = z.object({
  eventId:     z.string(),
  tierId:      z.string().optional(),
  name:        z.string().min(1),
  email:       z.string().email().optional().or(z.literal("")),
  phone:       z.string().optional(),
  status:      z.enum(["CONFIRMED", "DECLINED"]),
  plusOne:     z.boolean().default(false),
  dietaryReqs: z.string().optional(),
  message:     z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // H-1: Rate-limit public RSVP — 15 attempts per IP per 10 minutes
    if (await isRateLimited(`rsvp:${getClientIp(request)}`, 15, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many RSVP attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { eventId, tierId, name, email, phone, status, plusOne, dietaryReqs, message } = parsed.data;

    const event = await prisma.event.findFirst({
      where: { id: eventId, status: "PUBLISHED" },
      include: {
        host:  { select: { name: true, email: true, plan: true, planExpiresAt: true, role: true } },
        tiers: { select: { id: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // H-4: Verify the supplied tierId actually belongs to this event
    if (tierId && !event.tiers.some(t => t.id === tierId)) {
      return NextResponse.json({ error: "Invalid ticket tier" }, { status: 400 });
    }

    // Enforce host's plan guest limit (cheap pre-check outside the transaction)
    if (status === "CONFIRMED") {
      const limits = getPlanLimits(event.host.plan, event.host.planExpiresAt, event.host.role);
      if (limits.guests !== Infinity) {
        const guestCount = await prisma.guest.count({ where: { eventId } });
        if (guestCount >= limits.guests) {
          return NextResponse.json({ error: "This event is no longer accepting RSVPs." }, { status: 403 });
        }
      }
    }

    // ── Serialised capacity check + write ──────────────────────────────────
    // RepeatableRead prevents phantom reads: once we count confirmed guests,
    // no concurrent transaction can insert a new CONFIRMED guest that would
    // change our decision before we commit. Eliminates the TOCTOU race where
    // ten concurrent RSVPs all read "1 seat left" and all get confirmed.
    const { guest, waitlisted, wasConfirmedBefore } =
      await prisma.$transaction(async (tx) => {
        let finalStatus: string = status;
        let waitlisted = false;

        if (status === "CONFIRMED" && event.maxGuests) {
          const confirmedCount = await tx.guest.count({
            where: { eventId, status: "CONFIRMED" },
          });
          if (confirmedCount >= event.maxGuests) {
            finalStatus = "WAITLISTED";
            waitlisted = true;
          }
        }

        const existing = email
          ? await tx.guest.findFirst({ where: { eventId, email } })
          : null;

        const wasConfirmedBefore = existing?.status === "CONFIRMED";
        let guest;

        if (existing) {
          guest = await tx.guest.update({
            where: { id: existing.id },
            data: {
              status: finalStatus,
              name,
              phone:       phone       || null,
              plusOne,
              dietaryReqs: dietaryReqs || null,
              message:     message     || null,
            },
          });
        } else {
          guest = await tx.guest.create({
            data: {
              eventId, name,
              email:       email       || null,
              phone:       phone       || null,
              status:      finalStatus,
              plusOne,
              dietaryReqs: dietaryReqs || null,
              message:     message     || null,
              ...(tierId && { tierId }),
            },
          });
        }

        return { guest, waitlisted, wasConfirmedBefore };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

    // Promote from waitlist if a confirmed guest just declined
    if (wasConfirmedBefore && status === "DECLINED") {
      promoteFromWaitlist(eventId).catch(() => {});
    }

    // Emails are non-blocking — retry up to 3× before giving up silently
    if (email && !waitlisted) {
      withRetry(() => sendRSVPConfirmation({
        to: email, guestName: name, eventTitle: event.title,
        eventDate: event.date, eventLocation: event.location,
        status: "CONFIRMED", qrToken: guest.qrToken, hostName: event.host.name,
      }), { label: "rsvp-confirmation", retries: 3 }).catch(() => {});
    }

    withRetry(() => sendHostNotification({
      to: event.host.email, hostName: event.host.name,
      guestName: name, guestEmail: email || null, guestPhone: phone || null,
      eventTitle: event.title, status: waitlisted ? "WAITLISTED" : status, eventId,
    }), { label: "host-notification", retries: 3 }).catch(() => {});

    return NextResponse.json({ data: guest, waitlisted }, { status: 201 });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
