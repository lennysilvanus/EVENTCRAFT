import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const media = await prisma.eventMedia.findMany({
      where: { eventId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: media });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await request.json();
    if (!body.url) return NextResponse.json({ error: "url is required" }, { status: 400 });

    // M-6: Validate URL format to block javascript:/data: injection
    try { new URL(body.url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(body.url)) {
      return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
    }

    const count = await prisma.eventMedia.count({ where: { eventId: id } });
    if (count >= 20) {
      return NextResponse.json({ error: "Maximum 20 gallery images per event" }, { status: 400 });
    }

    const media = await prisma.eventMedia.create({
      data: {
        url: body.url,
        caption: body.caption || null,
        sortOrder: count,
        eventId: id,
      },
    });

    return NextResponse.json({ data: media }, { status: 201 });
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
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await request.json();
    if (!body.mediaId) return NextResponse.json({ error: "mediaId is required" }, { status: 400 });

    await prisma.eventMedia.deleteMany({ where: { id: body.mediaId, eventId: id } });

    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
