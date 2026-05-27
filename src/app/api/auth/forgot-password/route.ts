import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    // 5 requests per IP per hour — prevents email enumeration spam
    if (isRateLimited(`forgot:${getClientIp(request)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." }); // no 429 — avoid enumeration
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to avoid email enumeration
    if (!user) return NextResponse.json({ message: "If that email exists, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${APP_URL}/reset-password/${token}`;

    // Send email (gracefully skips if Resend not configured)
    const { sendPasswordReset } = await import("@/lib/email");
    await sendPasswordReset({ to: email, name: user.name, resetUrl }).catch(() => {});

    // In dev: log the URL so it's always usable
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Password Reset] ${email} → ${resetUrl}`);
    }

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
