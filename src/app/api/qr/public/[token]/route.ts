import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQRCode, getCheckinUrl } from "@/lib/qr";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const guest = await prisma.guest.findFirst({
      where: { qrToken: token },
      select: { id: true, name: true, qrToken: true, status: true, event: { select: { title: true } } },
    });

    if (!guest) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    if (guest.status === "DECLINED") return NextResponse.json({ error: "Guest declined" }, { status: 403 });

    const url = getCheckinUrl(guest.qrToken);
    const qrCode = await generateQRCode(url);

    return NextResponse.json({ data: { qrCode, url, guestName: guest.name, eventTitle: guest.event.title } });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR" }, { status: 500 });
  }
}
