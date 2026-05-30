import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    return NextResponse.json({
      status:    "ok",
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
      services: {
        database: { status: "ok", latencyMs: dbLatencyMs },
      },
    });
  } catch (err) {
    console.error("[health] Database check failed:", err);
    return NextResponse.json({
      status:    "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: "error", message: "Connection failed" },
      },
    }, { status: 503 });
  }
}
