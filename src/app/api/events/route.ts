import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plan-limits";
import { z } from "zod";

const tierSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  capacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

const createEventSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  date: z.string(),
  endDate: z.string().optional(),
  location: z.string().min(2),
  address: z.string().optional(),
  category: z.string().default("OTHER"),
  maxGuests: z.number().optional(),
  inviteText: z.string().optional(),
  dressCode: z.string().optional(),
  notes: z.string().optional(),
  isPublic: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  recurrenceType: z.enum(["NONE", "WEEKLY", "MONTHLY", "YEARLY"]).default("NONE"),
  recurrenceEnd: z.string().optional(),
  // L-3: Validate image URLs so javascript:/data: schemes can't be stored
  coverImage:  z.string().url().max(2048).optional().or(z.literal("")).or(z.literal(null)).optional(),
  posterImage: z.string().url().max(2048).optional().or(z.literal("")).or(z.literal(null)).optional(),
  videoUrl:    z.string().url().max(2048).optional().or(z.literal("")).or(z.literal(null)).optional(),
  ticketPrice: z.number().positive().optional(),
  ticketCurrency: z.string().default("TZS"),
  tiers: z.array(tierSchema).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const events = await prisma.event.findMany({
      where: { hostId: user.userId },
      include: {
        guests: { select: { id: true, status: true, checkedIn: true } },
        _count: { select: { guests: true } },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Enforce plan event limits
    const fullUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true, planExpiresAt: true, role: true, eventCredits: true } });
    const limits = getPlanLimits(fullUser?.plan ?? "FREE", fullUser?.planExpiresAt, fullUser?.role);
    if (limits.events !== Infinity) {
      const eventCount = await prisma.event.count({ where: { hostId: user.userId } });
      if (eventCount >= limits.events) {
        if (!fullUser?.eventCredits || fullUser.eventCredits <= 0) {
          return NextResponse.json({
            error: `Your plan allows up to ${limits.events} events. Upgrade or buy an event credit to create more.`,
            code: "PLAN_LIMIT_EVENTS",
          }, { status: 403 });
        }
        // M-1: Decrement credit atomically inside the same transaction as event creation
        // so a failed create never silently consumes a credit
      }
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const needsCreditDecrement =
      limits.events !== Infinity &&
      (await prisma.event.count({ where: { hostId: user.userId } })) >= limits.events;

    const event = await prisma.$transaction(async (tx) => {
      // M-1: Decrement credit and create event atomically — one cannot succeed without the other
      if (needsCreditDecrement) {
        const updated = await tx.user.update({
          where: { id: user.userId },
          data:  { eventCredits: { decrement: 1 } },
          select: { eventCredits: true },
        });
        if (updated.eventCredits < 0) {
          throw Object.assign(new Error("No event credits available"), { code: "NO_CREDITS" });
        }
      }
      return tx.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        location: data.location,
        address: data.address || null,
        category: data.category,
        maxGuests: data.maxGuests || null,
        inviteText: data.inviteText || null,
        dressCode: data.dressCode || null,
        notes: data.notes || null,
        isPublic: data.isPublic,
        isTemplate: data.isTemplate,
        recurrenceType: data.recurrenceType,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        coverImage: data.coverImage || null,
        posterImage: data.posterImage || null,
        videoUrl: data.videoUrl || null,
        ticketPrice: data.ticketPrice ?? null,
        ticketCurrency: data.ticketCurrency,
        status: "DRAFT",
        hostId: user.userId,
        ...(data.tiers?.length && {
          tiers: {
            create: data.tiers.map((t, i) => ({
              name: t.name,
              description: t.description || null,
              price: t.price,
              capacity: t.capacity ?? null,
              sortOrder: t.sortOrder ?? i,
            })),
          },
        }),
      },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    });
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "NO_CREDITS") {
      return NextResponse.json({ error: "No event credits available", code: "PLAN_LIMIT_EVENTS" }, { status: 403 });
    }
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
