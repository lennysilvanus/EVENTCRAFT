import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";
import { generateInviteText } from "@/lib/ai";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  eventTitle: z.string().min(1).max(200),
  eventDate: z.string().max(100),
  eventTime: z.string().max(20),
  location: z.string().max(300),
  description: z.string().max(2000),  // hard cap to prevent prompt injection / token abuse
  category: z.string().max(50),
  dressCode: z.string().max(100).optional(),
  tone: z.enum(["formal", "casual", "fun", "elegant"]).default("elegant"),
});

export async function POST(request: Request) {
  try {
    // 20 generations per user per hour — protects Anthropic API costs
    if (isRateLimited(`ai-invite:${getClientIp(request)}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const inviteText = await generateInviteText({
      ...parsed.data,
      hostName: user.name,
    });

    return NextResponse.json({ data: { inviteText } });
  } catch (error) {
    console.error("AI generate invite error:", error);
    return NextResponse.json({ error: "Failed to generate invite text" }, { status: 500 });
  }
}
