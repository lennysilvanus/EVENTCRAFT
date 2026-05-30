import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, generateSecureToken } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sendEmailVerification } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone:    z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // 5 registrations per IP per hour
    if (await isRateLimited(`register:${getClientIp(request)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    // H-6: store hash in DB, send raw token in the verification URL
    const { raw: verificationToken, hashed: hashedVerificationToken } = generateSecureToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const ip                  = getClientIp(request);
    const userAgent           = request.headers.get("user-agent") ?? undefined;

    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPassword, phone: phone || null,
        emailVerificationToken:  hashedVerificationToken,
        emailVerificationExpiry: verificationExpiry,
        // PDPA / Tanzania Personal Data Protection Act — capture consent at
        // the moment of registration so it is timestamped, IP-attributed,
        // and stored against the user record for audit purposes.
        consentRecords: {
          create: [
            { type: "PRIVACY_POLICY", version: "1.0", ip, userAgent },
            { type: "TERMS",          version: "1.0", ip, userAgent },
          ],
        },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    sendEmailVerification({
      to: email,
      name,
      verifyUrl: `${appUrl}/verify-email?token=${verificationToken}`,
    }).catch(() => {});

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, status: "ACTIVE" });

    const response = NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: "Account created successfully",
    }, { status: 201 });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   30 * 24 * 60 * 60,
      path:     "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
