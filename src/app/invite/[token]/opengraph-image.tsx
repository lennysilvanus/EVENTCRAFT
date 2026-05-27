import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "EventCraft Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let title = "You're Invited";
  let host = "";
  let date = "";
  let location = "";
  let category = "🎉";

  try {
    const event = await prisma.event.findFirst({
      where: { inviteToken: token, status: "PUBLISHED" },
      include: { host: { select: { name: true } } },
    });

    if (event) {
      title = event.title;
      host = event.host.name;
      date = new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      location = event.location;
      const icons: Record<string, string> = {
        WEDDING: "💍", BIRTHDAY: "🎂", CORPORATE: "💼", CONCERT: "🎵",
        CONFERENCE: "🎤", SPORTS: "⚽", PARTY: "🥳", FESTIVAL: "🎪",
        CHARITY: "❤️", OTHER: "🎉",
      };
      category = icons[event.category] ?? "🎉";
    }
  } catch { /* use defaults */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #0a0f1e 0%, #111827 50%, #0d1532 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif", padding: "60px",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div style={{
          position: "absolute", top: "-100px", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)",
        }} />

        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px", marginBottom: "48px",
        }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px", background: "#4f46e5",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px",
          }}>✦</div>
          <span style={{ color: "#fff", fontSize: "22px", fontWeight: "700" }}>EventCraft</span>
        </div>

        {/* Category icon */}
        <div style={{ fontSize: "72px", marginBottom: "24px" }}>{category}</div>

        {/* Invite label */}
        <div style={{
          color: "#818cf8", fontSize: "14px", fontWeight: "600",
          letterSpacing: "4px", textTransform: "uppercase", marginBottom: "16px",
        }}>
          {host ? `${host} invites you to` : "You're invited to"}
        </div>

        {/* Event title */}
        <div style={{
          color: "#fff", fontSize: title.length > 30 ? "42px" : "56px",
          fontWeight: "900", textAlign: "center", lineHeight: 1.1,
          marginBottom: "32px", maxWidth: "900px",
        }}>
          {title}
        </div>

        {/* Event details */}
        <div style={{
          display: "flex", gap: "32px", color: "#94a3b8", fontSize: "18px",
        }}>
          {date && <span>📅 {date}</span>}
          {location && <span>📍 {location}</span>}
        </div>

        {/* Bottom badge */}
        <div style={{
          position: "absolute", bottom: "40px",
          background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "100px", padding: "8px 20px",
          color: "#a5b4fc", fontSize: "14px",
        }}>
          RSVP on EventCraft
        </div>
      </div>
    ),
    { ...size }
  );
}
