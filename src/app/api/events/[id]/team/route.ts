import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEWER", "CHECKIN", "MANAGER", "CO_HOST"]),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookies(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await prisma.eventMember.findMany({
    where: { eventId: id },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: members });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { email, role } = parsed.data;
    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) return NextResponse.json({ error: "No EventCraft account found with that email" }, { status: 404 });
    if (invitee.id === user.userId) return NextResponse.json({ error: "You are already the host" }, { status: 400 });

    const member = await prisma.eventMember.upsert({
      where: { userId_eventId: { userId: invitee.id, eventId: id } },
      update: { role },
      create: { userId: invitee.id, eventId: id, role },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { memberId } = await request.json();
    await prisma.eventMember.delete({ where: { id: memberId } });

    return NextResponse.json({ message: "Member removed" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
