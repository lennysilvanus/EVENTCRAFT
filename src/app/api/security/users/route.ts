import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSecurityAdmin, isGuardError } from "@/lib/security-guard";

export async function GET(request: Request) {
  const guard = await requireSecurityAdmin(request);
  if (isGuardError(guard)) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const status = searchParams.get("status") ?? "ALL";
    const search = searchParams.get("search") ?? "";
    const skip = (page - 1) * limit;

    const where = {
      ...(status !== "ALL" && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, status: true,
          plan: true, createdAt: true, lastLoginAt: true, lastLoginIp: true,
          _count: { select: { events: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Security users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
