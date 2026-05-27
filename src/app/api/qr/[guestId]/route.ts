import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { generateQRCode, getCheckinUrl } from "@/lib/qr";

export async function GET(request: Request, { params }: { params: Promise<{ guestId: string }> }) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { guestId } = await params;
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: { event: { select: { hostId: true } } },
    });

    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    if (guest.event.hostId !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = getCheckinUrl(guest.qrToken);
    const qrDataUrl = await generateQRCode(url);

    return NextResponse.json({ data: { qrCode: qrDataUrl, url, guest } });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
