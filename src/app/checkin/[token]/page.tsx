"use client";

import { useEffect, useState, use } from "react";
import { CheckCircle2, XCircle, Clock, Calendar, MapPin, Sparkles } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface GuestInfo {
  id: string;
  name: string;
  status: string;
  checkedIn: boolean;
  event: {
    title: string;
    date: string;
    location: string;
    category?: string | null;
    coverImage?: string | null;
    coverColor?: string | null;
  };
}

// Category-aware accent colours — matches ticket page palette for visual continuity
const CATEGORY_ACCENT: Record<string, string> = {
  WEDDING:    "#f43f5e",
  BIRTHDAY:   "#f97316",
  CORPORATE:  "#60a5fa",
  CONCERT:    "#a78bfa",
  SPORTS:     "#34d399",
  CONFERENCE: "#38bdf8",
  PARTY:      "#f472b6",
  FUNDRAISER: "#f87171",
  OTHER:      "#818cf8",
};

function accentFor(category?: string | null, coverColor?: string | null): string {
  if (category && CATEGORY_ACCENT[category]) return CATEGORY_ACCENT[category];
  return coverColor || "#4f46e5";
}

export default function CheckinTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/checkin/${token}`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.error && data.data) {
          setStatus("already");
          setGuest(data.data);
          setMessage(data.error);
        } else if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("success");
          setGuest(data.data);
          setMessage(data.message || "Check-in successful!");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [token]);

  const coverImage = guest?.event?.coverImage;
  const accent = accentFor(guest?.event?.category, guest?.event?.coverColor);

  const stateConfig = {
    loading: {
      icon: <div className="w-20 h-20 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />,
      title: "Checking you in…",
      ring: "ring-white/20",
      glow: "bg-white/5",
      label: null,
    },
    success: {
      icon: <CheckCircle2 size={72} className="text-emerald-400 drop-shadow-lg" />,
      title: "Welcome!",
      ring: "ring-emerald-500/50",
      glow: "bg-emerald-500/10",
      label: <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Checked in ✓</span>,
    },
    already: {
      icon: <Clock size={72} className="text-amber-400 drop-shadow-lg" />,
      title: "Already checked in",
      ring: "ring-amber-500/40",
      glow: "bg-amber-500/10",
      label: <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">Previously scanned</span>,
    },
    error: {
      icon: <XCircle size={72} className="text-red-400 drop-shadow-lg" />,
      title: "Check-in failed",
      ring: "ring-red-500/40",
      glow: "bg-red-500/10",
      label: null,
    },
  }[status];

  return (
    <div id="ci-root" className="min-h-screen flex flex-col bg-slate-950">
      {/* Category accent injected as a CSS var — avoids inline style on child elements */}
      <style>{`#ci-root { --ci-accent-alpha: ${accent}40; }`}</style>

      {/* ── Hero — full-bleed cover image with gradient fade ────── */}
      <div className="relative w-full h-72 shrink-0 overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 [background:linear-gradient(135deg,var(--ci-accent-alpha)_0%,#0f172a_100%)]" />
        )}
        {/* Gradient fade to page background */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/50 to-transparent" />

        {/* Logo */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">EventCraft</span>
        </div>

        {/* Event title */}
        {guest?.event && (
          <div className="absolute bottom-5 left-0 right-0 px-6 text-center">
            <p className="text-white font-black text-xl leading-snug drop-shadow-lg line-clamp-2">
              {guest.event.title}
            </p>
          </div>
        )}
      </div>

      {/* ── Content card — floats over gradient ─────────────────── */}
      <div className="flex flex-col items-center flex-1 px-5 -mt-4 pb-10">
        <div className="w-full max-w-sm">

          {/* Status card */}
          <div className={`rounded-2xl border border-white/10 ${stateConfig.glow} backdrop-blur-sm p-8 text-center mb-4 ring-1 ${stateConfig.ring}`}>
            <div className="flex justify-center mb-5">{stateConfig.icon}</div>
            {stateConfig.label && <div className="mb-3">{stateConfig.label}</div>}
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">{stateConfig.title}</h1>
            {/* Guest name — large and readable for staff at a distance */}
            {guest && (
              <p className="text-3xl font-black text-white/95 tracking-tight mt-1 leading-tight">
                {guest.name}
              </p>
            )}
            {!guest && <p className="text-sm text-white/50 mt-1">{message}</p>}
          </div>

          {/* Event details */}
          {guest?.event && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2.5">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Event Details</p>
              <div className="flex items-center gap-2.5 text-sm text-white/80">
                <Calendar size={14} className="shrink-0 text-white/40" />
                <span className="font-medium">{formatDate(guest.event.date)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/70">
                <Clock size={14} className="shrink-0 text-white/40" />
                {formatTime(guest.event.date)}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/70">
                <MapPin size={14} className="shrink-0 text-white/40" />
                {guest.event.location}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-white/20 mt-6">Powered by EventCraft</p>
        </div>
      </div>
    </div>
  );
}
