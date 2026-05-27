import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { sendEmailVerification } from "@/lib/email";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    // 3 resends per user per hour
    if (isRateLimited(`resend-verif:${getClientIp(request)}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, name: true, emailVerified: true },
    });

    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (dbUser.emailVerified) return NextResponse.json({ message: "Email already verified" });

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.userId },
      data: { emailVerificationToken: token, emailVerificationExpiry: expiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendEmailVerification({
      to: dbUser.email,
      name: dbUser.name,
      verifyUrl: `${appUrl}/verify-email?token=${token}`,
    });

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
