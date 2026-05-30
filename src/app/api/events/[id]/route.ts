import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const updateEventSchema = z.object({
  title:          z.string().min(2).max(200).optional(),
  description:    z.string().min(10).max(5000).optional(),
  date:           z.string().optional(),
  endDate:        z.string().nullable().optional(),
  location:       z.string().min(2).max(300).optional(),
  address:        z.string().max(500).nullable().optional(),
  category:       z.string().max(50).optional(),
  maxGuests:      z.number().int().positive().nullable().optional(),
  inviteText:     z.string().max(3000).nullable().optional(),
  dressCode:      z.string().max(200).nullable().optional(),
  notes:          z.string().max(3000).nullable().optional(),
  isPublic:       z.boolean().optional(),
  isTemplate:     z.boolean().optional(),
  recurrenceType: z.enum(["NONE", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  recurrenceEnd:  z.string().nullable().optional(),
  coverImage:     z.string().url().max(2048).nullable().optional().or(z.literal("")),
  posterImage:    z.string().url().max(2048).nullable().optional().or(z.literal("")),
  videoUrl:       z.string().url().max(2048).nullable().optional().or(z.literal("")),
  status:         z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  ticketPrice:    z.number().nonnegative().nullable().optional(),
  ticketCurrency: z.string().max(10).optional(),
  tiers:          z.array(z.object({
    id:           z.string().optional(),
    name:         z.string().min(1).max(100),
    description:  z.string().max(500).optional(),
    price:        z.number().min(0),
    capacity:     z.number().int().positive().nullable().optional(),
    sortOrder:    z.number().int().default(0),
  })).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({
      where: { id, hostId: user.userId },
      include: {
        host: { select: { id: true, name: true, email: true } },
        guests: { orderBy: { createdAt: "desc" }, include: { tier: true } },
        inviteLinks: { orderBy: { createdAt: "desc" } },
        tiers: { orderBy: { sortOrder: "asc" } },
        media: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error("GET /api/events/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const rawBody = await request.json();
    // M-4: Validate + constrain all fields to prevent unbounded string storage
    const parsed = updateEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const body = parsed.data;

    const [event] = await prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: {
          ...(body.title      && { title: body.title }),
          ...(body.description && { description: body.description }),
          ...(body.date       && { date: new Date(body.date) }),
          ...(body.endDate    !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
          ...(body.location   && { location: body.location }),
          ...(body.address    !== undefined && { address: body.address }),
          ...(body.category   && { category: body.category }),
          ...(body.maxGuests  !== undefined && { maxGuests: body.maxGuests }),
          ...(body.inviteText !== undefined && { inviteText: body.inviteText }),
          ...(body.dressCode  !== undefined && { dressCode: body.dressCode }),
          ...(body.notes      !== undefined && { notes: body.notes }),
          ...(body.isPublic   !== undefined && { isPublic: body.isPublic }),
          ...(body.isTemplate !== undefined && { isTemplate: body.isTemplate }),
          ...(body.recurrenceType && { recurrenceType: body.recurrenceType }),
          ...(body.recurrenceEnd !== undefined && { recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null }),
          ...(body.posterImage !== undefined && { posterImage: body.posterImage || null }),
          ...(body.videoUrl   !== undefined && { videoUrl: body.videoUrl || null }),
          ...(body.status     && { status: body.status }),
          ...(body.coverImage !== undefined && { coverImage: body.coverImage || null }),
          ...(body.ticketPrice !== undefined && { ticketPrice: body.ticketPrice }),
          ...(body.ticketCurrency && { ticketCurrency: body.ticketCurrency }),
        },
        include: { tiers: { orderBy: { sortOrder: "asc" } } },
      });

      if (Array.isArray(body.tiers)) {
        await tx.ticketTier.deleteMany({ where: { eventId: id } });
        if (body.tiers.length > 0) {
          await tx.ticketTier.createMany({
            data: body.tiers.map((t, i) => ({
              name: t.name,
              description: t.description || null,
              price: t.price,
              capacity: t.capacity ?? null,
              sortOrder: t.sortOrder ?? i,
              eventId: id,
            })),
          });
        }
      }

      return [updated];
    });

    const withTiers = await prisma.event.findUnique({
      where: { id },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ data: withTiers });
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const where = user.role === "ADMIN" ? { id } : { id, hostId: user.userId };
    const existing = await prisma.event.findFirst({ where });
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    await prisma.event.delete({ where: { id } });

    // L-1: Await audit log so the entry is guaranteed written before we respond
    await logAudit({
      action:      "EVENT_DELETED",
      actorId:     user.userId,
      actorEmail:  user.email,
      targetId:    id,
      targetType:  "EVENT",
      targetLabel: existing.title,
      ip:          getClientIp(request),
    });

    return NextResponse.json({ message: "Event deleted" });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
