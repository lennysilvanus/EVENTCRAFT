"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, CheckCircle2, Clock, XCircle, RefreshCw,
  Wifi, UserCheck, Search, Calendar, MapPin,
} from "lucide-react";
import { formatTime, formatDate } from "@/lib/utils";

interface LiveGuest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  plusOne: boolean;
}

interface LiveData {
  event: { id: string; title: string; date: string; location: string; maxGuests: number | null };
  stats: { total: number; confirmed: number; checkedIn: number; pending: number; declined: number };
  guests: LiveGuest[];
  recentArrivals: LiveGuest[];
}

type Filter = "all" | "arrived" | "awaited" | "pending";

export default function LiveCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<LiveData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pulse, setPulse] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const refresh = useCallback(() => {
    fetch(`/api/events/${id}/live`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setData(d.data);
          setLastUpdate(new Date());
          setPulse(true);
          setTimeout(() => setPulse(false), 600);
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 6000);
    return () => clearInterval(interval);
  }, [refresh]);

  const filteredGuests = (data?.guests ?? []).filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.email?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === "all" ? true :
      filter === "arrived" ? g.checkedIn :
      filter === "awaited" ? !g.checkedIn && g.status === "CONFIRMED" :
      filter === "pending" ? g.status === "PENDING" : true;
    return matchSearch && matchFilter;
  });

  const attendanceRate = data
    ? data.stats.confirmed > 0
      ? Math.round((data.stats.checkedIn / data.stats.confirmed) * 100)
      : 0
    : 0;

  return (
    <div className="min-h-screen" style={{ background: "#060e1b" }}>
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ background: "#060e1b" }}>
        <div className="flex items-center gap-4">
          <Link href={`/events/${id}`} className="text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-emerald-500 ${pulse ? "scale-150" : ""} transition-transform`} />
              <span className="text-white font-semibold text-sm">Live Check-In</span>
            </div>
            {data && (
              <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                <Calendar size={10} /> {data.event.title}
                <span className="text-slate-700">•</span>
                <MapPin size={10} /> {data.event.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-600 text-xs">
            {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Connecting..."}
          </span>
          <button onClick={refresh} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
            <RefreshCw size={14} />
          </button>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
            <Wifi size={12} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium">Live</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Big stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Checked In",
              value: data?.stats.checkedIn ?? 0,
              total: data?.stats.confirmed ?? 0,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
              icon: <UserCheck size={20} className="text-emerald-400" />,
            },
            {
              label: "Confirmed",
              value: data?.stats.confirmed ?? 0,
              total: data?.stats.total ?? 0,
              color: "text-indigo-400",
              bg: "bg-indigo-500/10 border-indigo-500/20",
              icon: <CheckCircle2 size={20} className="text-indigo-400" />,
            },
            {
              label: "Pending",
              value: data?.stats.pending ?? 0,
              total: data?.stats.total ?? 0,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20",
              icon: <Clock size={20} className="text-amber-400" />,
            },
            {
              label: "Declined",
              value: data?.stats.declined ?? 0,
              total: data?.stats.total ?? 0,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-500/20",
              icon: <XCircle size={20} className="text-red-400" />,
            },
          ].map(({ label, value, total, color, bg, icon }) => (
            <div key={label} className={`rounded-2xl border p-5 ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                {icon}
              </div>
              <div className="flex items-end gap-1">
                <span className={`text-4xl font-black ${color}`}>{value}</span>
                <span className="text-slate-600 text-lg mb-1">/{total}</span>
              </div>
              {total > 0 && (
                <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${color.replace("text-", "bg-")}`}
                    style={{ width: `${Math.round((value / total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Attendance progress */}
        {data && data.stats.confirmed > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Attendance Rate</span>
              <span className={`text-2xl font-black ${attendanceRate >= 80 ? "text-emerald-400" : attendanceRate >= 50 ? "text-amber-400" : "text-slate-400"}`}>
                {attendanceRate}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${attendanceRate}%`,
                  background: attendanceRate >= 80 ? "#10b981" : attendanceRate >= 50 ? "#f59e0b" : "#6366f1",
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-600">{data.stats.checkedIn} arrived</span>
              <span className="text-xs text-slate-600">{data.stats.confirmed - data.stats.checkedIn} not yet</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent arrivals */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Recent Arrivals
              </h2>
            </div>
            <div className="divide-y divide-slate-800">
              {(data?.recentArrivals ?? []).length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={24} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">No arrivals yet</p>
                </div>
              ) : (
                (data?.recentArrivals ?? []).map((g, i) => (
                  <div key={g.id} className={`flex items-center gap-3 px-5 py-3 ${i === 0 ? "bg-emerald-500/5" : ""}`}>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{g.name}</p>
                      {g.checkedInAt && (
                        <p className="text-xs text-slate-500">{formatTime(g.checkedInAt)}</p>
                      )}
                    </div>
                    {i === 0 && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 rounded px-1.5 py-0.5 shrink-0">Latest</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Full guest list */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search guests..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "arrived", "awaited", "pending"] as Filter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      filter === f
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {f === "awaited" ? "Not in" : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
              {filteredGuests.length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={24} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">No guests match</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-800">
                    {filteredGuests.map(g => (
                      <tr key={g.id} className={`${g.checkedIn ? "bg-emerald-500/3" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                              g.checkedIn
                                ? "bg-emerald-500/20 text-emerald-400"
                                : g.status === "CONFIRMED"
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "bg-slate-700 text-slate-400"
                            }`}>
                              {g.checkedIn ? <CheckCircle2 size={14} /> : g.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-white">{g.name}</p>
                              {g.email && <p className="text-xs text-slate-500 truncate max-w-[160px]">{g.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {g.checkedIn ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-semibold text-emerald-400">✓ Arrived</span>
                              {g.checkedInAt && <span className="text-xs text-slate-600">{formatTime(g.checkedInAt)}</span>}
                            </div>
                          ) : (
                            <span className={`text-xs font-medium ${
                              g.status === "CONFIRMED" ? "text-indigo-400" :
                              g.status === "PENDING" ? "text-amber-400" : "text-red-400"
                            }`}>
                              {g.status === "CONFIRMED" ? "Confirmed" : g.status === "PENDING" ? "Pending" : "Declined"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
