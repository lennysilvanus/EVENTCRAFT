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
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.auditLog.count(),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
