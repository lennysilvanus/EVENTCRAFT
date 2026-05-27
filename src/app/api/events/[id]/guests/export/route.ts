import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await prisma.event.findFirst({ where: { id, hostId: user.userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const guests = await prisma.guest.findMany({
      where: { eventId: id },
      include: { tier: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    const header = ["Name", "Email", "Phone", "Status", "Tier", "Plus One", "Dietary Reqs", "Message", "Checked In", "Checked In At", "Added"];
    const rows = guests.map(g => [
      g.name,
      g.email ?? "",
      g.phone ?? "",
      g.status,
      g.tier?.name ?? "",
      g.plusOne ? "Yes" : "No",
      g.dietaryReqs ?? "",
      (g.message ?? "").replace(/,/g, ";"),
      g.checkedIn ? "Yes" : "No",
      g.checkedInAt ? new Date(g.checkedInAt).toLocaleString() : "",
      new Date(g.createdAt).toLocaleString(),
    ]);

    // Sanitise each cell: escape quotes and neutralise formula-injection prefixes
    const safeCsv = (v: string) => {
      const s = String(v).replace(/"/g, '""');
      return /^[=+\-@\t\r]/.test(s) ? `"'${s}"` : `"${s}"`;
    };
    const csv = [header, ...rows].map(r => r.map(safeCsv).join(",")).join("\n");
    const filename = `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-guests.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Guest export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
