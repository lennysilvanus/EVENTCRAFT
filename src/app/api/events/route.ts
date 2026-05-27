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
  coverImage: z.string().optional(),
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
    const fullUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true, planExpiresAt: true } });
    const limits = getPlanLimits(fullUser?.plan ?? "FREE", fullUser?.planExpiresAt);
    if (limits.events !== Infinity) {
      const eventCount = await prisma.event.count({ where: { hostId: user.userId } });
      if (eventCount >= limits.events) {
        return NextResponse.json({
          error: `Your plan allows up to ${limits.events} events. Upgrade to create more.`,
          code: "PLAN_LIMIT_EVENTS",
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const event = await prisma.event.create({
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
        coverImage: data.coverImage || null,
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

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
