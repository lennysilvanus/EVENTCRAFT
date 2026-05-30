"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Calendar, MapPin, Users, Globe, Filter, PlayCircle, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { formatDate, formatTime, getCategoryIcon, EVENT_CATEGORIES } from "@/lib/utils";
import Input from "@/components/ui/Input";
import { Card3D } from "@/components/ui/Card";
import Navbar from "@/components/layout/Navbar";

interface PublicEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  address?: string;
  category: string;
  coverImage?: string | null;
  coverColor?: string | null;
  posterImage?: string | null;
  videoUrl?: string | null;
  ticketPrice?: number | null;
  ticketCurrency: string;
  maxGuests?: number | null;
  inviteToken: string;
  dressCode?: string | null;
  host: { name: string };
  _count: { guests: number };
}

const CATEGORY_OPTIONS = [{ value: "ALL", label: "All Events" }, ...EVENT_CATEGORIES.map(c => ({ value: c.value, label: c.label }))];

export default function ExplorePage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "24" });
    if (search) params.set("search", search);
    if (category !== "ALL") params.set("category", category);
    fetch(`/api/events/public?${params}`).then(r => r.json()).then(d => {
      if (d.data) { setEvents(d.data); setTotalPages(d.pagination.pages || 1); setTotal(d.pagination.total || 0); }
    }).finally(() => setLoading(false));
  }, [page, search, category]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleCategory = (v: string) => { setCategory(v); setPage(1); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative text-center mb-14 py-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.2),transparent)] pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-semibold mb-6">
              <Globe size={13} /> Public Events
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-4 leading-tight">
              Discover <span className="text-indigo-400">Events</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-lg mx-auto">
              Conferences, weddings, concerts and more — all hosted on EventCraft.
            </p>
          </div>
        </div>

        {/* ── Search + Filter ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search events, venues, hosts..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 hover:border-indigo-500/30 transition-colors">
            <Filter size={14} className="text-indigo-400 shrink-0" />
            <select
              value={category}
              onChange={e => handleCategory(e.target.value)}
              className="bg-transparent text-sm text-slate-300 py-2.5 pr-1 outline-none cursor-pointer"
            >
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-slate-500 text-sm mb-8">
            {total === 0
              ? "No events found"
              : <><span className="text-white font-semibold">{total}</span> event{total !== 1 ? "s" : ""} found</>}
          </p>
        )}

        {/* ── Grid ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative perspective-[1000px]">
                <div className="absolute inset-0 rounded-2xl bg-[#04060f] translate-y-3 translate-x-2" />
                <div className="relative h-72 bg-card border border-border rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-5">🎉</div>
            <p className="text-white font-black text-xl mb-2">No public events found</p>
            <p className="text-slate-500 text-sm mb-8">Try a different search or category</p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors shadow-[0_4px_0_0_#312e81]">
              Host your own event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-6 border-t border-border/40">
            <p className="text-sm text-slate-500 order-2 sm:order-1">
              Page <span className="text-white font-semibold">{page}</span> of <span className="text-white font-semibold">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold border border-border bg-card text-slate-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={14} /> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === "…" ? (
                  <span key={`e-${i}`} className="px-2 text-slate-600 select-none">…</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p as number)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold border transition-all ${
                      page === p
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_4px_0_0_#312e81]"
                        : "bg-card border-border text-slate-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5"
                    }`}>
                    {p}
                  </button>
                ))}

              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold border border-border bg-card text-slate-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <div className="mt-20">
          <Card3D rounded="2xl" intensity="normal">
            <div className="bg-card border border-indigo-500/20 rounded-2xl p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />
              <div className="relative">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 mb-5">
                  <Sparkles size={24} />
                </div>
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Host your own event</h2>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">Create stunning invitations with AI, manage guests, sell tickets — all in one place.</p>
                <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-[0_4px_0_0_#312e81] hover:shadow-[0_5px_0_0_#312e81] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none">
                  Get started free
                </Link>
              </div>
            </div>
          </Card3D>
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">Event<span className="text-indigo-400">Craft</span></span>
          </div>
          <p className="text-slate-600 text-xs">
            Powered by <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">EventCraft</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  const isFree = !event.ticketPrice || event.ticketPrice === 0;
  const spotsLeft = event.maxGuests ? event.maxGuests - event._count.guests : null;

  return (
    <div className="group relative perspective-[1000px]">
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

      {/* Main card */}
      <Link
        href={`/invite/${event.inviteToken}`}
        className="relative block bg-[#0b1120] border border-[#1e2d45] rounded-2xl overflow-hidden
          transition-all duration-300 ease-out
          shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]
          group-hover:[transform:rotateX(3deg)_rotateY(-3deg)_translateY(-10px)_translateX(-2px)]
          group-hover:border-indigo-500/50
          group-hover:shadow-[0_32px_80px_rgba(0,0,0,0.7),0_8px_24px_rgba(79,70,229,0.2)]"
      >
        {/* Cover image — taller for more impact */}
        <div className="relative h-52 overflow-hidden">
          {event.coverImage ? (
            <>
              <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-linear-to-t from-[#0b1120] via-[#0b1120]/30 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl bg-[radial-gradient(ellipse_at_center,#1e1b4b,#04060f)]">
              {getCategoryIcon(event.category)}
            </div>
          )}

          {/* Top-left: category + video badges */}
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/10">
              {getCategoryIcon(event.category)} {event.category}
            </span>
            {event.videoUrl && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-red-500/30 text-red-200 backdrop-blur-sm border border-red-500/30">
                <PlayCircle size={10} /> Video
              </span>
            )}
          </div>

          {/* Top-right: price badge */}
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border ${isFree ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"}`}>
              {isFree ? "Free" : `${event.ticketCurrency} ${event.ticketPrice?.toLocaleString()}`}
            </span>
          </div>

          {/* Title overlaid on image — WSJ bold treatment */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <h3 className="text-lg font-black text-white leading-tight line-clamp-2 tracking-tight drop-shadow-lg group-hover:text-indigo-100 transition-colors">
              {event.title}
            </h3>
          </div>
        </div>

        {/* Bottom strip — clean metadata */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar size={11} className="text-indigo-400 shrink-0" />
              <span className="font-medium">{formatDate(event.date)} · {formatTime(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={11} className="text-indigo-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
            {spotsLeft !== null && (
              <div className="flex items-center gap-2 text-xs">
                <Users size={11} className="text-indigo-400 shrink-0" />
                <span className={spotsLeft === 0 ? "text-red-400 font-semibold" : "text-slate-400"}>
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : "Fully booked"}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs text-slate-600">by {event.host.name}</span>
            <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
              RSVP →
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
