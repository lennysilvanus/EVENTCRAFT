import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
    const category = searchParams.get("category") ?? "";
    const search = searchParams.get("search") ?? "";
    const skip = (page - 1) * limit;

    const where = {
      isPublic: true,
      isTemplate: false,
      status: "PUBLISHED",
      date: { gte: new Date() },
      ...(category && category !== "ALL" && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { location: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [events, total] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          endDate: true,
          location: true,
          address: true,
          category: true,
          coverImage: true,
          coverColor: true,
          posterImage: true,
          videoUrl: true,
          ticketPrice: true,
          ticketCurrency: true,
          maxGuests: true,
          inviteToken: true,
          dressCode: true,
          host: { select: { name: true } },
          _count: { select: { guests: true } },
        },
        orderBy: { date: "asc" },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Public events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
