"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown, Globe, Monitor } from "lucide-react";
import { buildGoogleCalendarUrl, buildOutlookUrl } from "@/lib/calendar";

interface Props {
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
  /** Guest qrToken — used to download the ICS file via /api/calendar/[qrToken] */
  qrToken?: string;
  size?: "sm" | "md";
  variant?: "outline" | "ghost";
}

export default function AddToCalendar({ title, start, end, location, description, qrToken, size = "md", variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const endDate = end ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const ev = { title, start, end: endDate, location, description };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sizeClass = size === "sm"
    ? "text-xs px-2.5 py-1.5 gap-1.5"
    : "text-sm px-3.5 py-2 gap-2";

  const variantClass = variant === "ghost"
    ? "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-700/50"
    : "bg-transparent border border-border text-slate-300 hover:border-indigo-500/50 hover:text-white";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center rounded-xl font-medium transition-colors ${sizeClass} ${variantClass}`}
      >
        <CalendarPlus size={size === "sm" ? 13 : 15} />
        Add to Calendar
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 min-w-45 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <a
            href={buildGoogleCalendarUrl(ev)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/10 hover:text-white transition-colors"
          >
            <Globe size={15} className="text-indigo-400 shrink-0" />
            Google Calendar
          </a>
          <a
            href={buildOutlookUrl(ev)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/10 hover:text-white transition-colors"
          >
            <Monitor size={15} className="text-blue-400 shrink-0" />
            Outlook
          </a>
          {qrToken && (
            <a
              href={`/api/calendar/${qrToken}`}
              download
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/10 hover:text-white transition-colors border-t border-border"
            >
              <CalendarPlus size={15} className="text-slate-400 shrink-0" />
              Apple / Other (.ics)
            </a>
          )}
        </div>
      )}
    </div>
  );
}
