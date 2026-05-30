import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Email verification is required before publishing an event.
    // This prevents unverified accounts from operating as hosts and
    // collecting payment or RSVPs under an email they do not own.
    if (event.status !== "PUBLISHED") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { emailVerified: true },
      });
      if (!dbUser?.emailVerified) {
        return NextResponse.json(
          {
            error: "You must verify your email address before publishing an event.",
            code:  "EMAIL_NOT_VERIFIED",
          },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { status: event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
