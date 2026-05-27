"use client";

import { useEffect, useState, use } from "react";
import { Calendar, Clock, MapPin, Download, Share2, QrCode, Sparkles, CheckCircle2, XCircle, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
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
            id: token,
            name: guestData.data.guestName,
            status: "CONFIRMED",
            checkedIn: false,
            plusOne: false,
            qrToken: token,
          },
          event: {
            title: guestData.data.eventTitle,
            date: new Date().toISOString(),
            location: "",
            category: "OTHER",
            host: { name: "" },
          },
          qrCode: guestData.data.qrCode,
        });

        // Fetch full guest+event details
        const checkinRes = await fetch(`/api/checkin/${token}`);
        const checkinData = await checkinRes.json();
        if (checkinRes.ok && checkinData.data) {
          const g = checkinData.data;
          setData({
            guest: {
              id: g.id,
              name: g.name,
              status: g.status,
              checkedIn: g.checkedIn,
              plusOne: g.plusOne,
              qrToken: g.qrToken,
              tier: g.tier ?? null,
            },
            event: {
              title: g.event.title,
              date: g.event.date,
              location: g.event.location,
              address: g.event.address ?? null,
              category: g.event.category ?? "OTHER",
              dressCode: g.event.dressCode ?? null,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Ticket Not Found</h1>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const colors = CATEGORY_COLORS[data.event.category] ?? CATEGORY_COLORS.OTHER;
  const categoryIcon = getCategoryIcon(data.event.category);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 20%, ${colors.glow}, transparent)` }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-base">EventCraft</span>
        </div>

        {/* Ticket Card */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: `1px solid ${colors.accent}22` }}
          id="ticket-card"
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-6 py-3"
            style={{ background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }}
          >
            <span className="text-white text-xs font-semibold tracking-widest uppercase opacity-80">Event Pass</span>
            {data.guest.checkedIn && (
              <span className="flex items-center gap-1 text-white text-xs">
                <CheckCircle2 size={12} /> Checked In
              </span>
            )}
          </div>

          {/* Event hero */}
          <div
            className="flex flex-col items-center text-center px-8 py-8 border-b border-white/5"
            style={{ background: `linear-gradient(180deg, ${colors.from}18 0%, transparent 100%)` }}
          >
            <div className="text-5xl mb-4">{categoryIcon}</div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: colors.accent }}>
              {data.event.host?.name ? `${data.event.host.name} invites you to` : "You're invited to"}
            </p>
            <h1 className="text-2xl font-extrabold text-white leading-tight">{data.event.title}</h1>
          </div>

          {/* Event details */}
          <div className="px-6 py-5 flex flex-col gap-3" style={{ backgroundColor: "#0d1526" }}>
            {data.event.date && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={14} className="shrink-0" style={{ color: colors.accent }} />
                  <span className="text-slate-200 font-medium">{formatDate(data.event.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={14} className="shrink-0" style={{ color: colors.accent }} />
                  <span className="text-slate-200">{formatTime(data.event.date)}</span>
                </div>
              </>
            )}
            {data.event.location && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={14} className="shrink-0 mt-0.5" style={{ color: colors.accent }} />
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

          {/* Perforated divider */}
          <div className="relative flex items-center" style={{ backgroundColor: "#0d1526" }}>
            <div
              className="absolute left-0 w-5 h-5 rounded-full"
              style={{ backgroundColor: "#060e1b", transform: "translateX(-50%)" }}
            />
            <div className="flex-1 mx-3" style={{ borderTop: `2px dashed ${colors.accent}30` }} />
            <div
              className="absolute right-0 w-5 h-5 rounded-full"
              style={{ backgroundColor: "#060e1b", transform: "translateX(50%)" }}
            />
          </div>

          {/* Guest + QR */}
          <div
            className="flex items-center justify-between px-6 py-5"
            style={{ backgroundColor: "#0d1526" }}
          >
            {/* Guest info */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Admitted Guest</p>
              <p className="text-xl font-extrabold text-white">{data.guest.name}</p>
              {data.guest.plusOne && (
                <p className="text-xs text-slate-400">+1 Guest included</p>
              )}
              <div
                className="flex items-center gap-1.5 mt-1 rounded-md px-2.5 py-1 w-fit text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: data.guest.status === "CONFIRMED" ? "#052e16" : "#1c1917",
                  border: `1px solid ${data.guest.status === "CONFIRMED" ? "#166534" : "#292524"}`,
                  color: data.guest.status === "CONFIRMED" ? "#4ade80" : "#a8a29e",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: data.guest.status === "CONFIRMED" ? "#22c55e" : "#a8a29e" }}
                />
                {data.guest.status}
              </div>
              {data.guest.tier && (
                <div
                  className="flex items-center gap-1 mt-1.5 rounded-md px-2.5 py-1 w-fit text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: "#1e1654", border: "1px solid #4f46e5", color: colors.accent }}
                >
                  ★ {data.guest.tier.name}
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-white p-2.5 rounded-xl shadow-lg">
                <img src={data.qrCode} alt="Check-in QR" width={112} height={112} />
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <QrCode size={10} /> scan at door
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-center py-3"
            style={{ backgroundColor: "#060e1b", borderTop: "1px solid #1e3050" }}
          >
            <span className="text-xs text-slate-600">Powered by </span>
            <span className="text-xs font-semibold ml-1" style={{ color: colors.accent }}>EventCraft</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex flex-col gap-3">
          <Button
            onClick={handleDownload}
            loading={downloading}
            icon={<Download size={16} />}
            className="w-full"
          >
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
            <Button
              variant="outline"
              onClick={() => window.print()}
              icon={<Printer size={15} />}
              className="w-full"
            >
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              icon={<Share2 size={15} />}
              className="w-full"
            >
              Share
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Keep this ticket accessible — you&apos;ll need it at the entrance
        </p>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(#__next) { display: none; }
          .no-print { display: none !important; }
          #ticket-card { box-shadow: none; border: 1px solid #ccc; }
        }
      `}</style>
    </div>
  );
}
