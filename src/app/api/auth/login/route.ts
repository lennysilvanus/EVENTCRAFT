import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    // M-3: Rate-limit both by IP and by email to block distributed per-account attacks
    if (await isRateLimited(`login:ip:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    if (await isRateLimited(`login:email:${email.toLowerCase()}`, 15, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await prisma.loginAttempt.create({ data: { email, ip, success: false } });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      await prisma.loginAttempt.create({ data: { email, ip, success: false, userId: user.id } });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "SUSPENDED") {
      await prisma.loginAttempt.create({ data: { email, ip, success: false, userId: user.id } });
      return NextResponse.json({ error: "Your account has been suspended. Please contact support." }, { status: 403 });
    }

    if (user.status === "BANNED") {
      await prisma.loginAttempt.create({ data: { email, ip, success: false, userId: user.id } });
      return NextResponse.json({ error: "Your account has been banned." }, { status: 403 });
    }

    // Record successful login
    await Promise.all([
      prisma.loginAttempt.create({ data: { email, ip, success: true, userId: user.id } }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } }),
    ]);

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, status: user.status });

    const response = NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: "Login successful",
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
