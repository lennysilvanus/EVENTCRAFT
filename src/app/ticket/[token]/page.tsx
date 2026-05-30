"use client";

import { useEffect, useState, use } from "react";
import { Calendar, Clock, MapPin, Download, Share2, QrCode, Sparkles, CheckCircle2, XCircle, Printer, Star } from "lucide-react";
import { formatDate, formatTime, getCategoryIcon } from "@/lib/utils";
import Button from "@/components/ui/Button";
import AddToCalendar from "@/components/ui/AddToCalendar";

interface TicketData {
  guest: {
    id: string;
    name: string;
    status: string;
    checkedIn: boolean;
    plusOne: boolean;
    qrToken: string;
    tier?: { name: string; description?: string | null } | null;
  };
  event: {
    title: string;
    date: string;
    location: string;
    address?: string | null;
    category: string;
    dressCode?: string | null;
    coverImage?: string | null;
    host: { name: string };
  };
  qrCode: string;
}

const CATEGORY_COLORS: Record<string, { from: string; to: string; accent: string; glow: string }> = {
  WEDDING:    { from: "#9d174d", to: "#500724", accent: "#f43f5e", glow: "rgba(244,63,94,0.15)" },
  BIRTHDAY:   { from: "#c2410c", to: "#7c2d12", accent: "#f97316", glow: "rgba(249,115,22,0.15)" },
  CORPORATE:  { from: "#1e40af", to: "#1e3a8a", accent: "#60a5fa", glow: "rgba(96,165,250,0.15)" },
  CONCERT:    { from: "#6d28d9", to: "#4c1d95", accent: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
  SPORTS:     { from: "#065f46", to: "#064e3b", accent: "#34d399", glow: "rgba(52,211,153,0.15)" },
  CONFERENCE: { from: "#0369a1", to: "#075985", accent: "#38bdf8", glow: "rgba(56,189,248,0.15)" },
  PARTY:      { from: "#be185d", to: "#9d174d", accent: "#f472b6", glow: "rgba(244,114,182,0.15)" },
  FUNDRAISER: { from: "#991b1b", to: "#7f1d1d", accent: "#f87171", glow: "rgba(248,113,113,0.15)" },
  OTHER:      { from: "#312e81", to: "#1e1b4b", accent: "#818cf8", glow: "rgba(129,140,248,0.15)" },
};

function formatCategory(cat: string): string {
  if (cat === "OTHER") return "General";
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

export default function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const guestRes = await fetch(`/api/qr/public/${token}`);
        const guestData = await guestRes.json();
        if (!guestRes.ok) throw new Error(guestData.error || "Invalid ticket");

        setData({
          guest: {
            id: token, name: guestData.data.guestName,
            status: "CONFIRMED", checkedIn: false, plusOne: false, qrToken: token,
          },
          event: {
            title: guestData.data.eventTitle, date: new Date().toISOString(),
            location: "", category: "OTHER", host: { name: "" },
          },
          qrCode: guestData.data.qrCode,
        });

        const checkinRes = await fetch(`/api/checkin/${token}`);
        const checkinData = await checkinRes.json();
        if (checkinRes.ok && checkinData.data) {
          const g = checkinData.data;
          setData({
            guest: {
              id: g.id, name: g.name, status: g.status,
              checkedIn: g.checkedIn, plusOne: g.plusOne,
              qrToken: g.qrToken, tier: g.tier ?? null,
            },
            event: {
              title: g.event.title, date: g.event.date, location: g.event.location,
              address: g.event.address ?? null, category: g.event.category ?? "OTHER",
              dressCode: g.event.dressCode ?? null, coverImage: g.event.coverImage ?? null,
              host: g.event.host ?? { name: "" },
            },
            qrCode: guestData.data.qrCode,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ticket not found");
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/ticket/${token}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eventcraft-ticket-${data?.guest.name?.replace(/\s+/g, "-") ?? token}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `My ticket for ${data?.event.title}`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Ticket link copied!");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <XCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-black text-white tracking-tight mb-2">Ticket Not Found</h1>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    </div>
  );

  const colors = CATEGORY_COLORS[data.event.category] ?? CATEGORY_COLORS.OTHER;
  const categoryIcon = getCategoryIcon(data.event.category);
  const isConfirmed = data.guest.status === "CONFIRMED";

  return (
    <div id="tc-root" className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Scoped CSS custom properties — keeps dynamic category colours out of inline styles */}
      <style>{`
        #tc-root {
          --tc-accent:      ${colors.accent};
          --tc-header:      linear-gradient(90deg, ${colors.from}, ${colors.to});
          --tc-hero-fade:   linear-gradient(180deg, ${colors.from}22 0%, transparent 100%);
          --tc-badge-bg:    ${colors.accent}18;
          --tc-tier-border: ${colors.accent}60;
          --tc-perf-dash:   ${colors.accent}35;
          --tc-glow:        radial-gradient(ellipse 60% 40% at 50% 20%, ${colors.glow}, transparent);
          --tc-border:      ${colors.accent}40;
        }
        @media print {
          body > *:not(#__next) { display: none; }
          .no-print { display: none !important; }
          #ticket-card { box-shadow: none; border: 1px solid #ccc; }
        }
      `}</style>
      {/* Ambient glow uses the injected gradient var */}
      <div className="fixed inset-0 pointer-events-none [background:var(--tc-glow)]" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-base">EventCraft</span>
        </div>

        {/* ── Ticket Card ─────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-2xl [border:1px_solid_var(--tc-border)]" id="ticket-card">

          {/* Coloured header strip */}
          <div className="flex items-center justify-between px-6 py-3 [background:var(--tc-header)]">
            <span className="text-white text-xs font-semibold tracking-widest uppercase opacity-90">Event Pass</span>
            {data.guest.checkedIn && (
              <span className="flex items-center gap-1 text-white text-xs font-medium">
                <CheckCircle2 size={12} /> Checked In
              </span>
            )}
          </div>

          {/* ── Hero — cover image if available, category gradient fallback ── */}
          {data.event.coverImage ? (
            <div className="relative h-44 overflow-hidden">
              <img src={data.event.coverImage} alt={data.event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-0 right-0 px-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1 opacity-80 [color:var(--tc-accent)]">
                  {data.event.host?.name ? `${data.event.host.name} invites you to` : "You're invited to"}
                </p>
                <h1 className="text-xl font-black text-white leading-tight tracking-tight drop-shadow-lg">{data.event.title}</h1>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center px-8 py-7 border-b border-white/5 [background:var(--tc-hero-fade)]">
              <div className="text-5xl mb-3">{categoryIcon}</div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5 [color:var(--tc-accent)]">
                {data.event.host?.name ? `${data.event.host.name} invites you to` : "You're invited to"}
              </p>
              <h1 className="text-2xl font-black text-white leading-tight tracking-tight">{data.event.title}</h1>
            </div>
          )}

          {/* ── Event details ────────────────────────────────────────── */}
          <div className="px-6 py-5 flex flex-col gap-3 bg-[#0d1526]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Event Details</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide [color:var(--tc-accent)] [background:var(--tc-badge-bg)]">
                {formatCategory(data.event.category)}
              </span>
            </div>
            {data.event.date && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={14} className="shrink-0 [color:var(--tc-accent)]" />
                  <span className="text-slate-200 font-medium">{formatDate(data.event.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={14} className="shrink-0 [color:var(--tc-accent)]" />
                  <span className="text-slate-200">{formatTime(data.event.date)}</span>
                </div>
              </>
            )}
            {data.event.location && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={14} className="shrink-0 mt-0.5 [color:var(--tc-accent)]" />
                <div>
                  <p className="text-slate-200">{data.event.location}</p>
                  {data.event.address && <p className="text-slate-500 text-xs mt-0.5">{data.event.address}</p>}
                </div>
              </div>
            )}
            {data.event.dressCode && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-sm shrink-0">👔</span>
                <span className="text-slate-400 text-xs">Dress code: {data.event.dressCode}</span>
              </div>
            )}
          </div>

          {/* ── Perforated tear line ─────────────────────────────────── */}
          <div className="relative flex items-center bg-[#0d1526]">
            <div className="absolute left-0 w-5 h-5 rounded-full bg-[#060e1b] -translate-x-1/2" />
            <div className="flex-1 mx-4 [border-top:2px_dashed_var(--tc-perf-dash)]" />
            <div className="absolute right-0 w-5 h-5 rounded-full bg-[#060e1b] translate-x-1/2" />
          </div>

          {/* ── Guest + QR ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-5 bg-[#0d1526]">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Admitted Guest</p>
              <p className="text-2xl font-black text-white tracking-tight leading-tight truncate">{data.guest.name}</p>
              {data.guest.plusOne && <p className="text-xs text-slate-400">+ 1 guest</p>}

              {/* Status badge */}
              <div className={`flex items-center gap-1.5 mt-1 rounded-md px-2.5 py-1 w-fit text-xs font-bold uppercase tracking-wider border ${
                isConfirmed
                  ? "bg-[#052e16] border-[#166534] text-[#4ade80]"
                  : "bg-[#1c1917] border-[#292524] text-[#a8a29e]"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? "bg-[#22c55e]" : "bg-[#a8a29e]"}`} />
                {data.guest.status}
              </div>

              {/* Tier badge */}
              {data.guest.tier && (
                <div className="flex items-center gap-1 mt-1 rounded-md px-2.5 py-1 w-fit text-xs font-bold uppercase tracking-wider bg-[#1e1654] [border:1px_solid_var(--tc-tier-border)] [color:var(--tc-accent)]">
                  <Star size={10} fill="currentColor" />
                  {data.guest.tier.name}
                </div>
              )}
            </div>

            {/* QR Code — 160×160 for reliable scanning at the door */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="bg-white p-2.5 rounded-xl shadow-lg">
                <img src={data.qrCode} alt="Check-in QR" width={160} height={160} />
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <QrCode size={10} /> scan at door
              </p>
            </div>
          </div>

          {/* Ticket footer */}
          <div className="flex items-center justify-center py-3 border-t border-[#1e3050] bg-[#060e1b]">
            <span className="text-xs text-slate-600">Powered by </span>
            <span className="text-xs font-semibold ml-1 [color:var(--tc-accent)]">EventCraft</span>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────── */}
        <div className="mt-5 flex flex-col gap-3">
          <Button onClick={handleDownload} loading={downloading} icon={<Download size={16} />} className="w-full">
            Download Ticket (.png)
          </Button>
          {data.event.date && (
            <AddToCalendar
              title={data.event.title}
              start={new Date(data.event.date)}
              location={[data.event.location, data.event.address].filter(Boolean).join(", ") || undefined}
              qrToken={token}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => window.print()} icon={<Printer size={15} />} className="w-full">
              Print
            </Button>
            <Button variant="outline" onClick={handleShare} icon={<Share2 size={15} />} className="w-full">
              Share
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Keep this ticket accessible — you&apos;ll need it at the entrance
        </p>
      </div>

    </div>
  );
}
