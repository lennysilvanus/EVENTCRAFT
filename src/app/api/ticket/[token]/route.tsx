import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { generateQRCode, getCheckinUrl } from "@/lib/qr";
import { format } from "date-fns";

export const runtime = "nodejs";

const CATEGORY_GRADIENTS: Record<string, [string, string, string]> = {
  WEDDING:    ["#9d174d", "#831843", "#f43f5e"],
  BIRTHDAY:   ["#c2410c", "#7c2d12", "#f97316"],
  CORPORATE:  ["#1e40af", "#1e3a8a", "#60a5fa"],
  CONCERT:    ["#6d28d9", "#4c1d95", "#a78bfa"],
  SPORTS:     ["#065f46", "#064e3b", "#34d399"],
  CONFERENCE: ["#0369a1", "#075985", "#38bdf8"],
  PARTY:      ["#be185d", "#9d174d", "#f472b6"],
  FUNDRAISER: ["#991b1b", "#7f1d1d", "#f87171"],
  OTHER:      ["#312e81", "#1e1b4b", "#818cf8"],
};

const CATEGORY_ICONS: Record<string, string> = {
  WEDDING: "💍", BIRTHDAY: "🎂", CORPORATE: "💼", CONCERT: "🎵",
  SPORTS: "⚽", CONFERENCE: "🎤", PARTY: "🎉", FUNDRAISER: "❤️", OTHER: "📅",
};

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const guest = await prisma.guest.findFirst({
    where: { qrToken: token },
    include: {
      event: {
        select: {
          title: true, date: true, location: true, address: true,
          category: true, dressCode: true, host: { select: { name: true } },
        },
      },
    },
  });

  if (!guest) return new Response("Not found", { status: 404 });

  const { event } = guest;
  const [gradFrom, gradTo, accentColor] = CATEGORY_GRADIENTS[event.category] ?? CATEGORY_GRADIENTS.OTHER;
  const categoryIcon = CATEGORY_ICONS[event.category] ?? "📅";
  const eventDate = new Date(event.date);
  const dateStr = format(eventDate, "EEEE, MMMM d, yyyy");
  const timeStr = format(eventDate, "h:mm a");

  const checkinUrl = getCheckinUrl(guest.qrToken);
  const qrDataUrl = await generateQRCode(checkinUrl);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0a1628",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 36px",
            height: 56,
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, color: "white",
              }}
            >
              ✨
            </div>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>
              Event<span style={{ color: "rgba(255,255,255,0.65)" }}>Craft</span>
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
            Guest Pass
          </span>
        </div>

        {/* Event hero section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "32px 40px 28px",
            background: `linear-gradient(180deg, ${gradFrom}22 0%, transparent 100%)`,
            borderBottom: "1px solid #1e3050",
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 14 }}>{categoryIcon}</div>
          <div
            style={{
              fontSize: 11, fontWeight: 600, color: accentColor,
              letterSpacing: 4, textTransform: "uppercase", marginBottom: 10,
            }}
          >
            {event.host.name} invites you to
          </div>
          <div
            style={{
              fontSize: 26, fontWeight: 800, color: "#f1f5f9",
              textAlign: "center", lineHeight: 1.2, marginBottom: 6,
            }}
          >
            {event.title}
          </div>
        </div>

        {/* Event details */}
        <div
          style={{
            display: "flex", flexDirection: "column",
            padding: "24px 40px", gap: 10,
          }}
        >
          {[
            { icon: "📅", text: dateStr },
            { icon: "⏰", text: timeStr },
            { icon: "📍", text: event.location },
            ...(event.address ? [{ icon: "   ", text: event.address, small: true }] : []),
            ...(event.dressCode ? [{ icon: "👔", text: `Dress: ${event.dressCode}` }] : []),
          ].map(({ icon, text, small }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: small ? 12 : 15, width: 22 }}>{icon}</span>
              <span
                style={{
                  fontSize: small ? 12 : 14, color: small ? "#64748b" : "#cbd5e1",
                  fontWeight: small ? 400 : 500,
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Perforation tear line */}
        <div style={{ display: "flex", alignItems: "center", margin: "4px 0" }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: "#060e1b", marginLeft: -12,
            }}
          />
          <div
            style={{
              flex: 1, borderTop: "2px dashed #1e3050",
            }}
          />
          <div
            style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: "#060e1b", marginRight: -12,
            }}
          />
        </div>

        {/* Guest + QR section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 40px",
            flex: 1,
          }}
        >
          {/* Guest info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>
              Admitted Guest
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>
              {guest.name}
            </div>
            {guest.plusOne && (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>+1 Guest included</div>
            )}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 6,
                backgroundColor: guest.status === "CONFIRMED" ? "#052e16" : "#1c1917",
                border: `1px solid ${guest.status === "CONFIRMED" ? "#166534" : "#292524"}`,
                borderRadius: 6, padding: "4px 10px", width: "fit-content",
              }}
            >
              <div
                style={{
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: guest.status === "CONFIRMED" ? "#22c55e" : "#a8a29e",
                }}
              />
              <span
                style={{
                  fontSize: 11, fontWeight: 700,
                  color: guest.status === "CONFIRMED" ? "#4ade80" : "#a8a29e",
                  letterSpacing: 1.5, textTransform: "uppercase",
                }}
              >
                {guest.status}
              </span>
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                backgroundColor: "white",
                padding: 10,
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} width={128} height={128} alt="QR" />
            </div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1 }}>
              Scan at entrance
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            borderTop: "1px solid #1e3050",
            backgroundColor: "#060e1b",
          }}
        >
          <span style={{ fontSize: 11, color: "#334155" }}>
            Powered by{" "}
          </span>
          <span style={{ fontSize: 11, color: accentColor, marginLeft: 4, fontWeight: 600 }}>
            EventCraft
          </span>
        </div>
      </div>
    ),
    {
      width: 500,
      height: 760,
    }
  );
}
