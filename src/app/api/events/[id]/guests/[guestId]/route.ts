import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { promoteFromWaitlist } from "@/lib/waitlist";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, guestId } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await request.json();
    const prevGuest = await prisma.guest.findUnique({ where: { id: guestId } });

    const guest = await prisma.guest.update({
      where: { id: guestId, eventId: id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.checkedIn !== undefined && {
          checkedIn: body.checkedIn,
          checkedInAt: body.checkedIn ? new Date() : null,
        }),
        ...(body.name && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
      },
    });

    // If a confirmed guest was declined/removed, try to promote from waitlist
    const wasConfirmed = prevGuest?.status === "CONFIRMED";
    const nowNotConfirmed = body.status && body.status !== "CONFIRMED";
    if (wasConfirmed && nowNotConfirmed) {
      promoteFromWaitlist(id).catch(() => {});
    }

    return NextResponse.json({ data: guest });
  } catch (error) {
    console.error("PUT guest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, guestId } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const guest = await prisma.guest.findUnique({ where: { id: guestId } });
    await prisma.guest.delete({ where: { id: guestId, eventId: id } });

    if (guest?.status === "CONFIRMED") {
      promoteFromWaitlist(id).catch(() => {});
    }

    return NextResponse.json({ message: "Guest removed" });
  } catch (error) {
    console.error("DELETE guest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
