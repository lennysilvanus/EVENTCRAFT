"use client";

import { useEffect, useState, Fragment, useCallback } from "react";
import {
  Search, Users, Star, TrendingUp, Mail, Phone,
  ChevronDown, Calendar, CheckCircle2, XCircle, Clock,
  MapPin, ChevronLeft, ChevronRight,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card3D } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

interface CRMRecord {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  totalEvents: number;
  confirmed: number;
  attended: number;
  lastSeen: string | null;
  tags: string[];
  appearances: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    status: string;
    checkedIn: boolean;
  }[];
}

function avatarGradient(totalEvents: number) {
  if (totalEvents >= 5) return "from-amber-500 to-orange-600";
  if (totalEvents >= 3) return "from-indigo-500 to-purple-600";
  return "from-slate-600 to-slate-700";
}

function loyaltyLabel(totalEvents: number) {
  if (totalEvents >= 5) return { label: "VIP", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
  if (totalEvents >= 3) return { label: "Loyal", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" };
  return null;
}

function StatusDot({ status }: { status: string }) {
  if (status === "CONFIRMED") return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />;
  if (status === "DECLINED")  return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
}

const PAGE_SIZE = 20;

export default function GuestCRMPage() {
  const [guests, setGuests]     = useState<CRMRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats]       = useState({ total: 0, repeat: 0, vip: 0, avgAttend: 0 });
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (q) params.set("search", q);
    fetch(`/api/guests?${params}`).then(r => r.json()).then(d => {
      if (d.data) {
        setGuests(d.data);
        setTotalPages(d.pagination.pages || 1);
        setTotalCount(d.pagination.total || 0);
        if (d.stats) setStats(d.stats);
      }
    }).finally(() => setLoading(false));
  }, []);

  // Debounce search — reset to page 1 when query changes
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1, search); }, 300);
    return () => clearTimeout(t);
  }, [search, load]);

  useEffect(() => { load(page, search); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalGuests   = stats.total;
  const repeatGuests  = stats.repeat;
  const vipGuests     = stats.vip;
  const avgAttendance = stats.avgAttend;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Guest Network</h1>
          <p className="text-slate-400 text-sm mt-1">Your complete guest history across all events</p>
        </div>

        {/* ── Stat cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: "Total Contacts",
              value: totalGuests,
              icon: <Users size={18} />,
              accent: "text-indigo-400",
              bg: "bg-indigo-500/10 border-indigo-500/20",
            },
            {
              label: "Repeat Guests",
              value: repeatGuests,
              icon: <Star size={18} />,
              accent: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20",
            },
            {
              label: "VIP Guests",
              value: vipGuests,
              icon: <Star size={18} fill="currentColor" />,
              accent: "text-orange-400",
              bg: "bg-orange-500/10 border-orange-500/20",
            },
            {
              label: "Avg Attendance",
              value: `${avgAttendance}%`,
              icon: <TrendingUp size={18} />,
              accent: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
            },
          ].map(s => (
            <Card3D key={s.label} intensity="normal">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
                  <div className={`p-2 rounded-lg border ${s.bg} ${s.accent}`}>{s.icon}</div>
                </div>
                <p className={`text-3xl font-black tracking-tight ${s.accent}`}>{s.value}</p>
              </div>
            </Card3D>
          ))}
        </div>

        {/* ── Search ────────────────────────────────────────────────── */}
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={16} />}
        />

        {/* ── Guest list ────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : guests.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-indigo-400" />
            </div>
            <p className="text-white font-semibold mb-1">No guests found</p>
            <p className="text-slate-500 text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {guests.map(g => {
              const loyalty   = loyaltyLabel(g.totalEvents);
              const isOpen    = expanded === g.key;
              const attendPct = g.confirmed > 0 ? Math.round((g.attended / g.confirmed) * 100) : 0;

              return (
                <Fragment key={g.key}>
                  {/* ── Guest row card ──────────────────────────────── */}
                  <Card3D intensity="subtle">
                    <div
                      className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer
                        hover:border-indigo-500/30 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : g.key)}
                    >
                      <div className="flex items-center gap-4 px-5 py-4">

                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${avatarGradient(g.totalEvents)} flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg`}>
                          {g.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Name + tags + contact */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-bold text-white tracking-tight">{g.name}</p>
                            {loyalty && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${loyalty.color}`}>
                                <Star size={8} fill="currentColor" /> {loyalty.label}
                              </span>
                            )}
                            {g.tags.map(t => (
                              <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/40">
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {g.email && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Mail size={10} className="text-indigo-400/60" /> {g.email}
                              </span>
                            )}
                            {g.phone && (
                              <span className="flex items-center gap-1 text-xs text-slate-600">
                                <Phone size={10} /> {g.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats pills */}
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 min-w-[52px]">
                            <span className="text-base font-black text-indigo-300">{g.totalEvents}</span>
                            <span className="text-[10px] text-indigo-400/70 font-medium">events</span>
                          </div>
                          <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 min-w-[52px]">
                            <span className="text-base font-black text-emerald-300">{attendPct}%</span>
                            <span className="text-[10px] text-emerald-400/70 font-medium">rate</span>
                          </div>
                          {g.lastSeen && (
                            <div className="hidden lg:flex flex-col items-center px-3 py-2 rounded-xl bg-slate-800/60 border border-border min-w-[72px]">
                              <span className="text-xs font-semibold text-slate-300">{formatDate(g.lastSeen)}</span>
                              <span className="text-[10px] text-slate-500 font-medium">last seen</span>
                            </div>
                          )}
                        </div>

                        {/* Chevron */}
                        <ChevronDown
                          size={16}
                          className={`text-slate-600 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-indigo-400" : ""}`}
                        />
                      </div>

                      {/* ── Event history (expanded) ─────────────────── */}
                      {isOpen && (
                        <div className="border-t border-border bg-surface/40 px-5 py-4">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                            Event History
                          </p>
                          <div className="flex flex-col gap-0">
                            {g.appearances.map((a, i) => (
                              <div key={i} className="flex gap-4 group/item">
                                {/* Timeline line */}
                                <div className="flex flex-col items-center pt-1">
                                  <StatusDot status={a.status} />
                                  {i < g.appearances.length - 1 && (
                                    <div className="w-px flex-1 bg-border/60 my-1" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-4 last:pb-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white leading-tight truncate">
                                        {a.eventTitle}
                                      </p>
                                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Calendar size={10} /> {formatDate(a.eventDate)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        a.status === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                        : a.status === "DECLINED" ? "bg-red-500/15 text-red-400 border-red-500/25"
                                        : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                      }`}>
                                        {a.status === "CONFIRMED" ? <CheckCircle2 size={9} className="inline mr-0.5" />
                                          : a.status === "DECLINED" ? <XCircle size={9} className="inline mr-0.5" />
                                          : <Clock size={9} className="inline mr-0.5" />}
                                        {a.status}
                                      </span>
                                      {a.checkedIn && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/25 flex items-center gap-0.5">
                                          <MapPin size={9} /> Attended
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card3D>
                </Fragment>
              );
            })}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {/* Result count */}
            <p className="text-sm text-slate-500 order-2 sm:order-1">
              Showing{" "}
              <span className="text-white font-semibold">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)}
              </span>{" "}
              of <span className="text-white font-semibold">{totalCount}</span> guests
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              {/* Prev */}
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium border border-border bg-card text-slate-400
                  hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border disabled:hover:text-slate-400
                  transition-all"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-600 select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p as number)}
                      className={`w-9 h-9 rounded-xl text-sm font-semibold border transition-all ${
                        page === p
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_4px_0_0_#312e81]"
                          : "bg-card border-border text-slate-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              {/* Next */}
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium border border-border bg-card text-slate-400
                  hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/5
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border disabled:hover:text-slate-400
                  transition-all"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Single-page result count */}
        {!loading && totalPages <= 1 && totalCount > 0 && (
          <p className="text-sm text-slate-600 text-center">
            {totalCount} guest{totalCount !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : " total"}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
