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
    coverImage?: string | null;
    coverColor?: string | null;
  };
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
  const coverColor = guest?.event?.coverColor || "#4f46e5";

  const stateConfig = {
    loading: {
      icon: <div className="w-12 h-12 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />,
      title: "Checking you in…",
      ring: "ring-white/20",
      glow: "bg-white/10",
      label: null,
    },
    success: {
      icon: <CheckCircle2 size={52} className="text-emerald-400 drop-shadow-lg" />,
      title: "Welcome!",
      ring: "ring-emerald-500/40",
      glow: "bg-emerald-500/10",
      label: <span className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Checked in</span>,
    },
    already: {
      icon: <Clock size={52} className="text-amber-400 drop-shadow-lg" />,
      title: "Already checked in",
      ring: "ring-amber-500/40",
      glow: "bg-amber-500/10",
      label: <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase">Previously scanned</span>,
    },
    error: {
      icon: <XCircle size={52} className="text-red-400 drop-shadow-lg" />,
      title: "Check-in failed",
      ring: "ring-red-500/40",
      glow: "bg-red-500/10",
      label: null,
    },
  }[status];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Hero — full-bleed cover image with gradient fade */}
      <div className="relative w-full h-72 shrink-0 overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 bg-[linear-gradient(135deg,var(--cover-color)_0%,#0f172a_100%)]"
            style={{ "--cover-color": `${coverColor}55` } as React.CSSProperties}
          />
        )}
        {/* Gradient fade to page background */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Logo */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">EventCraft</span>
        </div>

        {/* Event title on the image */}
        {guest?.event && (
          <div className="absolute bottom-5 left-0 right-0 px-6 text-center">
            <p className="text-white font-bold text-xl leading-snug drop-shadow-lg line-clamp-2">
              {guest.event.title}
            </p>
          </div>
        )}
      </div>

      {/* Content card — floats over gradient */}
      <div className="flex flex-col items-center flex-1 px-5 -mt-4 pb-10">
        <div className="w-full max-w-sm">

          {/* Status card */}
          <div className={`rounded-2xl border border-white/10 ${stateConfig.glow} backdrop-blur-sm p-7 text-center mb-4 ring-1 ${stateConfig.ring}`}>
            <div className="flex justify-center mb-4">{stateConfig.icon}</div>
            {stateConfig.label && <div className="mb-2">{stateConfig.label}</div>}
            <h1 className="text-2xl font-bold text-white mb-1">{stateConfig.title}</h1>
            {guest && <p className="text-lg text-white/90 font-medium">{guest.name}</p>}
            {!guest && <p className="text-sm text-white/50 mt-1">{message}</p>}
          </div>

          {/* Event details */}
          {guest?.event && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2.5">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">Event Details</p>
              <div className="flex items-center gap-2.5 text-sm text-white/70">
                <Calendar size={14} className="shrink-0 text-white/40" />
                {formatDate(guest.event.date)}
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
