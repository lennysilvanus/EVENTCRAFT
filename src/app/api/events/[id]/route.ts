import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

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

    const body = await request.json();

    const [event] = await prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: {
          ...(body.title && { title: body.title }),
          ...(body.description && { description: body.description }),
          ...(body.date && { date: new Date(body.date) }),
          ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
          ...(body.location && { location: body.location }),
          ...(body.address !== undefined && { address: body.address }),
          ...(body.category && { category: body.category }),
          ...(body.maxGuests !== undefined && { maxGuests: body.maxGuests }),
          ...(body.inviteText !== undefined && { inviteText: body.inviteText }),
          ...(body.dressCode !== undefined && { dressCode: body.dressCode }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
          ...(body.status && ["DRAFT", "PUBLISHED", "CANCELLED"].includes(body.status) && { status: body.status }),
          ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
          ...(body.ticketPrice !== undefined && { ticketPrice: body.ticketPrice }),
          ...(body.ticketCurrency && { ticketCurrency: body.ticketCurrency }),
        },
        include: { tiers: { orderBy: { sortOrder: "asc" } } },
      });

      if (Array.isArray(body.tiers)) {
        await tx.ticketTier.deleteMany({ where: { eventId: id } });
        if (body.tiers.length > 0) {
          await tx.ticketTier.createMany({
            data: body.tiers.map((t: { name: string; description?: string; price: number; capacity?: number | null; sortOrder?: number }, i: number) => ({
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
    const existing = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ message: "Event deleted" });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
