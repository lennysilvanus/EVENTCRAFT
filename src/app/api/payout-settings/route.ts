import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { z } from "zod";

const mobileSchema = z.object({
  type: z.literal("mobile_money"),
  network: z.string().min(1),
  phone: z.string().min(9),
  accountName: z.string().optional(),
});

const bankSchema = z.object({
  type: z.literal("bank_transfer"),
  bankName: z.string().min(1),
  bankCode: z.string().min(1),
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
});

const schema = z.discriminatedUnion("type", [mobileSchema, bankSchema]);

export async function GET(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const methods = await prisma.hostPayoutMethod.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: methods });
  } catch (error) {
    console.error("GET /api/payout-settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Clear existing default if setting a new one
    await prisma.hostPayoutMethod.updateMany({
      where: { userId: user.userId },
      data: { isDefault: false },
    });

    const method = await prisma.hostPayoutMethod.create({
      data: {
        userId: user.userId,
        isDefault: true,
        ...parsed.data,
      },
    });

    return NextResponse.json({ data: method }, { status: 201 });
  } catch (error) {
    console.error("POST /api/payout-settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    await prisma.hostPayoutMethod.deleteMany({ where: { id, userId: user.userId } });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE /api/payout-settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();

    await prisma.hostPayoutMethod.updateMany({
      where: { userId: user.userId },
      data: { isDefault: false },
    });
    await prisma.hostPayoutMethod.update({
      where: { id },
      data: { isDefault: true },
    });

    return NextResponse.json({ message: "Default updated" });
  } catch (error) {
    console.error("PATCH /api/payout-settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
