"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Calendar, Users, MapPin, Copy } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatTime, getCategoryIcon, isEventPast, EVENT_CATEGORIES } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Event } from "@/types";

interface EventWithGuests extends Omit<Event, "guests"> {
  guests: { status: string }[];
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

  useEffect(() => {
    fetch("/api/events").then(r => r.json()).then(d => {
      if (d.data) setEvents(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
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
            <h1 className="text-2xl font-bold text-white">My Events</h1>
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
                <div
                  key={event.id}
                  className={`group relative rounded-2xl overflow-hidden border border-border hover:border-indigo-500/40 transition-all duration-300 shadow-lg hover:shadow-indigo-900/20 hover:shadow-xl min-h-65 ${past ? "opacity-60" : ""}`}
                >
                  {/* Full-bleed image */}
                  <div className="absolute inset-0">
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl bg-linear-to-br from-indigo-900/60 to-slate-900">
                        {getCategoryIcon(event.category)}
                      </div>
                    )}
                    {/* Gradient fade — light at top, heavy at bottom */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/10" />
                  </div>

                  {/* Top row — status badge + duplicate */}
                  <div className="relative z-10 flex items-start justify-between p-4">
                    <StatusBadge status={event.status} />
                    <button
                      type="button"
                      aria-label="Duplicate event"
                      onClick={(e) => handleDuplicate(e, event.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white rounded-lg p-1.5"
                    >
                      {duplicating === event.id
                        ? <div className="w-3.5 h-3.5 border border-white/50 border-t-transparent rounded-full animate-spin" />
                        : <Copy size={13} />}
                    </button>
                  </div>

                  {/* Bottom details — sits on the gradient */}
                  <Link href={`/events/${event.id}`} className="absolute inset-0 z-10 flex flex-col justify-end p-5">
                    <h3 className="text-base font-bold text-white leading-snug mb-2 line-clamp-2">{event.title}</h3>
                    <div className="flex flex-col gap-1 mb-3">
                      <span className="flex items-center gap-1.5 text-xs text-white/70">
                        <Calendar size={11} className="shrink-0" />
                        {formatDate(event.date)} at {formatTime(event.date)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-white/60 truncate">
                        <MapPin size={11} className="shrink-0" />
                        {event.location}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <Users size={11} />
                        <span className="font-semibold text-white">{confirmed}</span>
                        <span>/ {total} confirmed</span>
                      </div>
                      {total > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full w-(--rate)" style={{ "--rate": confirmRate + "%" } as React.CSSProperties} />
                          </div>
                          <span className="text-xs text-emerald-400 font-semibold">{confirmRate}%</span>
                        </div>
                      )}
                    </div>
                    {past && <span className="mt-2 text-[10px] text-white/40 font-medium uppercase tracking-widest">Past event</span>}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
