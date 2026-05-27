import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
    select: { id: true, emailVerified: true, emailVerificationExpiry: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ message: "Email already verified" });
  }

  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
    return NextResponse.json({ error: "Verification link has expired. Please request a new one." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  return NextResponse.json({ message: "Email verified successfully" });
}
