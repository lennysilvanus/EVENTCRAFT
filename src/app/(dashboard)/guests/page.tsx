"use client";

import { useEffect, useState, Fragment } from "react";
import { Search, Users, Calendar, Star, ChevronRight, Mail, Phone, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
  appearances: { eventId: string; eventTitle: string; eventDate: string; status: string; checkedIn: boolean }[];
}

export default function GuestCRMPage() {
  const [guests, setGuests] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guests").then(r => r.json()).then(d => {
      if (d.data) setGuests(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.email?.toLowerCase().includes(search.toLowerCase())) ||
    (g.phone?.includes(search))
  );

  const totalGuests = guests.length;
  const repeatGuests = guests.filter(g => g.totalEvents > 1).length;
  const avgAttendance = guests.length > 0
    ? Math.round(guests.reduce((s, g) => s + (g.confirmed > 0 ? g.attended / g.confirmed : 0), 0) / guests.length * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Guest CRM</h1>
            <p className="text-slate-400 text-sm mt-1">Your complete guest network across all events</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Contacts", value: totalGuests, icon: <Users size={18} className="text-indigo-400" />, color: "text-indigo-400" },
            { label: "Repeat Guests", value: repeatGuests, icon: <Star size={18} className="text-amber-400" />, color: "text-amber-400" },
            { label: "Avg Attendance", value: `${avgAttendance}%`, icon: <TrendingUp size={18} className="text-emerald-400" />, color: "text-emerald-400" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                {icon}
              </div>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={16} />}
        />

        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <Users size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No guests found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-800/30">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Guest</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Contact</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Events</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Attended</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Last Seen</th>
                  <th className="px-4 py-3" scope="col" aria-label="Expand" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(g => (
                  <Fragment key={g.key}>
                    <tr
                      className="hover:bg-slate-800/20 cursor-pointer transition-colors"
                      onClick={() => setExpanded(expanded === g.key ? null : g.key)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            g.totalEvents >= 3 ? "bg-amber-500/20 text-amber-400" : "bg-indigo-600/20 text-indigo-400"
                          }`}>
                            {g.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{g.name}</p>
                              {g.totalEvents >= 3 && (
                                <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-0.5 flex items-center gap-1">
                                  <Star size={9} /> Loyal
                                </span>
                              )}
                            </div>
                            {g.tags.length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {g.tags.map(t => (
                                  <span key={t} className="text-xs bg-indigo-600/15 text-indigo-400 rounded px-1.5 py-0.5">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {g.email && <span className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} /> {g.email}</span>}
                          {g.phone && <span className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {g.phone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-bold text-white">{g.totalEvents}</span>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        <span className={`text-sm font-semibold ${g.attended === g.confirmed ? "text-emerald-400" : "text-slate-300"}`}>
                          {g.attended}/{g.confirmed}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-xs text-slate-400">{g.lastSeen ? formatDate(g.lastSeen) : "—"}</span>
                      </td>
                      <td className="px-4 py-4">
                        <ChevronRight size={16} className={`text-slate-600 transition-transform ${expanded === g.key ? "rotate-90" : ""}`} />
                      </td>
                    </tr>
                    {expanded === g.key && (
                      <tr>
                        <td colSpan={6} className="bg-slate-800/20 px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Event History</p>
                            {g.appearances.map((a, i) => (
                              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                                <div>
                                  <p className="text-sm text-white font-medium">{a.eventTitle}</p>
                                  <p className="text-xs text-slate-500">{formatDate(a.eventDate)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    a.status === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-400" :
                                    a.status === "DECLINED" ? "bg-red-500/15 text-red-400" :
                                    "bg-amber-500/15 text-amber-400"
                                  }`}>{a.status}</span>
                                  {a.checkedIn && (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                      <Calendar size={10} /> Attended
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
