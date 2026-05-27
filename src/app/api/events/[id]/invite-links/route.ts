import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await request.json();
    const link = await prisma.inviteLink.create({
      data: {
        eventId: id,
        label: body.label || null,
        maxUses: body.maxUses || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    return NextResponse.json({ data: link }, { status: 201 });
  } catch (error) {
    console.error("Create invite link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
