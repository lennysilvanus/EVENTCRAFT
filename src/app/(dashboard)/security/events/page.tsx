"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Calendar, EyeOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

interface SecEvent {
  id: string; title: string; status: string; isPublic: boolean; category: string;
  date: string; location: string; createdAt: string;
  host: { id: string; name: string; email: string };
  _count: { guests: number };
}

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: "bg-emerald-500/15 text-emerald-400",
  DRAFT: "bg-slate-500/15 text-slate-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

export default function SecurityEventsPage() {
  const [events, setEvents] = useState<SecEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/security/events?limit=100").then(r => r.json()).then(d => {
      if (d.data) setEvents(d.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const unpublish = async (id: string, title: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/security/events/${id}/unpublish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Security review" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`"${title}" unpublished`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Calendar size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Event Moderation</h1>
            <p className="text-slate-400 text-sm">Review and take action on published events</p>
          </div>
          <button onClick={load} className="ml-auto text-slate-400 hover:text-white p-2 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-800/30 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Event</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Host</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3 hidden sm:table-cell">Guests</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {events.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-white line-clamp-1">{e.title}</p>
                      <p className="text-xs text-slate-500">{e.category} · {e.isPublic ? "Public" : "Private"}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-xs text-slate-300">{e.host.name}</p>
                      <p className="text-xs text-slate-500">{e.host.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[e.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell text-sm font-bold text-white">{e._count.guests}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-500">{formatDate(e.date)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {e.status === "PUBLISHED" && (
                        <button
                          onClick={() => unpublish(e.id, e.title)}
                          disabled={acting === e.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <EyeOff size={12} /> Unpublish
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
