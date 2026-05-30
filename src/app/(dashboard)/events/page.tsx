"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Calendar, Users, MapPin, Copy, LayoutTemplate, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatTime, getCategoryIcon, isEventPast, EVENT_CATEGORIES } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Event } from "@/types";

interface EventWithGuests extends Omit<Event, "guests"> {
  guests: { status: string }[];
  isTemplate?: boolean;
  recurrenceType?: string;
}

const STATUS_FILTERS = ["ALL", "DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"];

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithGuests[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [recurring, setRecurring] = useState<string | null>(null);

  const handleDuplicate = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setDuplicating(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Event duplicated as draft");
      router.push(`/events/${data.data.id}`);
    } catch {
      toast.error("Failed to duplicate event");
      setDuplicating(null);
    }
  };

  const handleRecur = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setRecurring(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/recur`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Next occurrence created as draft");
      router.push(`/events/${data.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create next occurrence");
      setRecurring(null);
    }
  };

  const handleUseTemplate = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setDuplicating(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Event created from template");
      router.push(`/events/${data.data.id}/edit`);
    } catch {
      toast.error("Failed to use template");
      setDuplicating(null);
    }
  };

  useEffect(() => {
    fetch("/api/events").then(r => r.json()).then(d => {
      if (d.data) setEvents(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const templates = events.filter(e => e.isTemplate);

  const filtered = events.filter((e) => {
    if (e.isTemplate) return false;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    const matchCategory = categoryFilter === "ALL" || e.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aPast = isEventPast(a.date);
    const bPast = isEventPast(b.date);
    if (aPast !== bPast) return aPast ? 1 : -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">My Events</h1>
            <p className="text-slate-400 text-sm mt-1">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
          </div>
          <Link href="/events/new">
            <Button icon={<Plus size={16} />}>New Event</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search events, locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === s
                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                    : "bg-transparent border-border text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                {s === "ALL" ? "All Status" : s}
              </button>
            ))}
          </div>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-card border border-border text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50"
          >
            <option value="ALL">All Categories</option>
            {EVENT_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Templates section */}
        {!loading && templates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate size={15} className="text-purple-400" />
              <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">Templates</h2>
              <span className="text-xs text-slate-500">({templates.length})</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="group relative bg-card border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-4 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">{getCategoryIcon(tmpl.category)}</div>
                      <div>
                        <p className="text-sm font-semibold text-white line-clamp-1">{tmpl.title}</p>
                        <p className="text-xs text-slate-500">{tmpl.category}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">TEMPLATE</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={e => handleUseTemplate(e, tmpl.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium border border-purple-500/30 transition-colors"
                    >
                      {duplicating === tmpl.id
                        ? <div className="w-3 h-3 border border-purple-300/50 border-t-transparent rounded-full animate-spin" />
                        : <Plus size={12} />}
                      Use template
                    </button>
                    <Link
                      href={`/events/${tmpl.id}/edit`}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events list */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-border rounded-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Calendar size={28} />
            </div>
            <p className="text-white font-semibold mb-2">
              {search || statusFilter !== "ALL" ? "No events match your filters" : "No events yet"}
            </p>
            <p className="text-slate-500 text-sm mb-6">
              {search || statusFilter !== "ALL" ? "Try adjusting your search or filters" : "Create your first event to get started"}
            </p>
            {!search && statusFilter === "ALL" && (
              <Link href="/events/new">
                <Button icon={<Plus size={16} />}>Create your first event</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((event) => {
              const confirmed = event.guests?.filter(g => g.status === "CONFIRMED").length || 0;
              const total = event.guests?.length || 0;
              const past = isEventPast(event.date);
              const confirmRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

              return (
                /* ── 3-D card wrapper ───────────────────────────────────── */
                <div key={event.id} className={`group relative perspective-[1000px] ${past ? "opacity-60" : ""}`}>

                  {/* Depth layer 2 — furthest back */}
                  <div className="absolute inset-0 rounded-2xl bg-[#04060f] border border-[#0a0e1a]
                    translate-y-3 translate-x-2
                    transition-transform duration-300 ease-out
                    group-hover:translate-y-5 group-hover:translate-x-3" />
                  {/* Depth layer 1 */}
                  <div className="absolute inset-0 rounded-2xl bg-[#080c18] border border-[#0e1528]
                    translate-y-1.5 translate-x-1
                    transition-transform duration-300 ease-out
                    group-hover:translate-y-2.5 group-hover:translate-x-1.5" />

                  {/* ── Main card ──────────────────────────────────────────── */}
                  <div className="relative rounded-2xl overflow-hidden border border-[#1e2d45] min-h-72
                    transition-all duration-300 ease-out
                    shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]
                    group-hover:[transform:rotateX(3deg)_rotateY(-3deg)_translateY(-10px)_translateX(-2px)]
                    group-hover:border-indigo-500/50
                    group-hover:shadow-[0_32px_80px_rgba(0,0,0,0.7),0_8px_24px_rgba(79,70,229,0.2)]">

                    {/* Left accent strip — color by status */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] z-20
                      ${event.status === "PUBLISHED" ? "bg-linear-to-b from-emerald-500/0 via-emerald-500 to-emerald-500/0"
                        : event.status === "CANCELLED" ? "bg-linear-to-b from-red-500/0 via-red-500 to-red-500/0"
                        : "bg-linear-to-b from-indigo-500/0 via-indigo-500 to-indigo-500/0"}`} />

                    {/* Full-bleed image */}
                    <div className="absolute inset-0">
                      {event.coverImage ? (
                        <img src={event.coverImage} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl bg-linear-to-br from-indigo-900/60 to-[#04060f]">
                          {getCategoryIcon(event.category)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/50 to-black/5" />
                    </div>

                    {/* Top row — badges + actions */}
                    <div className="relative z-10 flex items-start justify-between p-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={event.status} />
                        {event.recurrenceType && event.recurrenceType !== "NONE" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-sm">
                            ↻ {event.recurrenceType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {event.recurrenceType && event.recurrenceType !== "NONE" && (
                          <button type="button" aria-label="Schedule next occurrence" onClick={(e) => handleRecur(e, event.id)}
                            className="bg-indigo-600/40 hover:bg-indigo-600/60 backdrop-blur-sm border border-indigo-400/20 text-indigo-200 hover:text-white rounded-lg p-1.5">
                            {recurring === event.id ? <div className="w-3.5 h-3.5 border border-indigo-200/50 border-t-transparent rounded-full animate-spin" /> : <RefreshCw size={13} />}
                          </button>
                        )}
                        <button type="button" aria-label="Duplicate event" onClick={(e) => handleDuplicate(e, event.id)}
                          className="bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white rounded-lg p-1.5">
                          {duplicating === event.id ? <div className="w-3.5 h-3.5 border border-white/50 border-t-transparent rounded-full animate-spin" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Bottom content */}
                    <Link href={`/events/${event.id}`} className="absolute inset-0 z-10 flex flex-col justify-end p-5">
                      {/* WSJ-style bold title */}
                      <h3 className="text-xl font-black text-white leading-tight mb-3 line-clamp-2 tracking-tight
                        group-hover:text-indigo-100 transition-colors drop-shadow-lg">
                        {event.title}
                      </h3>

                      {/* Metadata row */}
                      <div className="flex flex-col gap-1 mb-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-white/70">
                          <Calendar size={10} className="text-indigo-400 shrink-0" />
                          {formatDate(event.date)} · {formatTime(event.date)}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-white/50 truncate">
                          <MapPin size={10} className="text-indigo-400 shrink-0" />
                          {event.location}
                        </span>
                      </div>

                      {/* Stats strip */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-xs text-white/50">
                          <Users size={10} />
                          <span className="font-bold text-white/80">{confirmed}</span>
                          <span>/ {total} confirmed</span>
                        </div>
                        {total > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <progress
                              value={confirmRate}
                              max={100}
                              aria-label="Confirmation rate"
                              className="w-12 h-1 rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-400 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-400"
                            />
                            <span className="text-[11px] text-emerald-400 font-bold">{confirmRate}%</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Open →
                          </span>
                        )}
                      </div>
                      {past && <span className="mt-2 text-[10px] text-white/30 font-semibold uppercase tracking-[0.15em]">Past event</span>}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
