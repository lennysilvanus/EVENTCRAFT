import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const VALID_TYPES = ["AI_PROCESSING", "PRIVACY_POLICY", "TERMS"] as const;

const schema = z.object({
  type:    z.enum(VALID_TYPES),
  version: z.string().max(20).default("1.0"),
});

export async function POST(request: Request) {
  const user = await getAuthUserFromCookies(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { type, version } = parsed.data;
  const ip        = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  await prisma.consentRecord.create({
    data: { userId: user.userId, type, version, ip, userAgent },
  });

  return NextResponse.json({ data: { type, version } }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getAuthUserFromCookies(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url  = new URL(request.url);
  const type = url.searchParams.get("type");

  const where = type && VALID_TYPES.includes(type as typeof VALID_TYPES[number])
    ? { userId: user.userId, type }
    : { userId: user.userId };

  const records = await prisma.consentRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select:  { type: true, version: true, createdAt: true },
  });

  return NextResponse.json({ data: records });
}
