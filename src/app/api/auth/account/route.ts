import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies, verifyPassword } from "@/lib/auth";

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { password } = await request.json();
    if (!password) return NextResponse.json({ error: "Password is required to delete your account" }, { status: 400 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { password: true, role: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (dbUser.role === "ADMIN") {
      return NextResponse.json({ error: "Admin accounts cannot be deleted via this endpoint" }, { status: 403 });
    }

    const valid = await verifyPassword(password, dbUser.password);
    if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

    await prisma.user.delete({ where: { id: user.userId } });

    const response = NextResponse.json({ message: "Account deleted" });
    response.cookies.set("token", "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
