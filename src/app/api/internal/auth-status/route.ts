import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUserBlocked } from "@/lib/session";

// Called by the Edge proxy to check whether a user's session is still valid.
// Guarded by a shared internal secret so it cannot be called by external parties.
export async function GET(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const [blocked, user] = await Promise.all([
    isUserBlocked(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { status: true } }),
  ]);

  const active = !blocked && user?.status === "ACTIVE";
  return NextResponse.json({ active }, {
    headers: { "Cache-Control": "no-store" },
  });
}
