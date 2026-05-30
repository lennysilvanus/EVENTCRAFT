import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const eventInclude = {
      host: { select: { name: true, email: true } },
      _count: { select: { guests: true } },
      tiers: { orderBy: { sortOrder: "asc" as const } },
      media: { orderBy: { sortOrder: "asc" as const } },
    };

    const rawEvent = await prisma.event.findFirst({
      where: { inviteToken: token, status: "PUBLISHED" },
      include: eventInclude,
    });

    const addTierCapacity = async (ev: typeof rawEvent) => {
      if (!ev || !ev.tiers?.length) return ev;
      const counts = await prisma.guest.groupBy({
        by: ["tierId"],
        where: { eventId: ev.id, tierId: { not: null }, status: { in: ["CONFIRMED", "PENDING"] } },
        _count: true,
      });
      const countMap = Object.fromEntries(counts.map(c => [c.tierId, c._count]));
      return {
        ...ev,
        tiers: ev.tiers.map(t => ({
          ...t,
          sold: countMap[t.id] ?? 0,
          remaining: t.capacity != null ? t.capacity - (countMap[t.id] ?? 0) : null,
        })),
      };
    };

    const event = await addTierCapacity(rawEvent);

    if (!event) {
      const link = await prisma.inviteLink.findFirst({
        where: { token, isActive: true },
        include: {
          event: {
            include: eventInclude,
          },
        },
      });

      if (!link) return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });

      if (link.expiresAt && new Date() > link.expiresAt) {
        return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
      }
      if (link.maxUses && link.usageCount >= link.maxUses) {
        return NextResponse.json({ error: "This invite link has reached its limit" }, { status: 410 });
      }

      await prisma.inviteLink.update({ where: { id: link.id }, data: { usageCount: { increment: 1 } } });
      const linkEventWithCapacity = await addTierCapacity(link.event);
      return NextResponse.json({ data: linkEventWithCapacity });
    }

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error("GET invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
