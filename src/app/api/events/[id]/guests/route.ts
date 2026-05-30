import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plan-limits";
import { z } from "zod";
import { sendGuestInvite } from "@/lib/email";

const addGuestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  plusOne: z.boolean().default(false),
  sendInvite: z.boolean().default(false),
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

    // Enforce plan guest limits
    const fullUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true, planExpiresAt: true, role: true } });
    const limits = getPlanLimits(fullUser?.plan ?? "FREE", fullUser?.planExpiresAt, fullUser?.role);
    if (limits.guests !== Infinity) {
      const guestCount = await prisma.guest.count({ where: { eventId: id } });
      if (guestCount >= limits.guests) {
        return NextResponse.json({
          error: `Your plan allows up to ${limits.guests} guests per event. Upgrade to add more.`,
          code: "PLAN_LIMIT_GUESTS",
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = addGuestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { name, email, phone, plusOne, sendInvite } = parsed.data;

    const guest = await prisma.guest.create({
      data: { name, email: email || null, phone: phone || null, plusOne, eventId: id, status: "PENDING" },
    });

    if (sendInvite && email) {
      sendGuestInvite({
        to: email,
        guestName: name,
        hostName: event.host.name,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        inviteText: event.inviteText,
        inviteToken: event.inviteToken,
      }).catch(() => {});
    }

    return NextResponse.json({ data: guest }, { status: 201 });
  } catch (error) {
    console.error("POST guests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const guests = await prisma.guest.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: guests });
  } catch (error) {
    console.error("GET guests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
