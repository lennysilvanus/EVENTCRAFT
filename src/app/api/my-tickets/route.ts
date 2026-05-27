import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const guests = await prisma.guest.findMany({
      where: { email: { equals: email } },
      include: {
        event: {
          select: {
            id: true, title: true, date: true, endDate: true,
            location: true, address: true, category: true,
            status: true, inviteToken: true,
            host: { select: { name: true } },
          },
        },
        payment: { select: { status: true, amount: true, currency: true } },
      },
      orderBy: { event: { date: "desc" } },
    });

    return NextResponse.json({ data: guests });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
