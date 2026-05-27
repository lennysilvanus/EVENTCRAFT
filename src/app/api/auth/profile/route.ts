import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getAuthUserFromCookies, hashPassword, verifyPassword, signToken } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUserFromCookies(request);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { currentPassword, newPassword, ...profileData } = body;

    if (currentPassword && newPassword) {
      const parsed = passwordSchema.safeParse({ currentPassword, newPassword });
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.success === false ? parsed.error.issues[0].message : "Invalid" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: authUser.userId } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

      const hashed = await hashPassword(newPassword);
      await prisma.user.update({ where: { id: authUser.userId }, data: { password: hashed } });
      return NextResponse.json({ message: "Password updated" });
    }

    const parsed = profileSchema.safeParse(profileData);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        phone: parsed.data.phone ?? undefined,
      },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, createdAt: true },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
