"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LogIn, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Attempt { id: string; email: string; ip: string; success: boolean; userId: string | null; createdAt: string; }
interface TopIp { ip: string; count: number; }

export default function LoginAttemptsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [topIps, setTopIps] = useState<TopIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/security/login-attempts?page=${page}&limit=50&filter=${filter}`).then(r => r.json()).then(d => {
      if (d.data) { setAttempts(d.data); setTotalPages(d.pagination.pages || 1); }
      if (d.topFailingIps) setTopIps(d.topFailingIps);
    }).finally(() => setLoading(false));
  }, [page, filter]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <LogIn size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Login Attempts</h1>
            <p className="text-slate-400 text-sm">Authentication events and brute-force monitoring</p>
          </div>
        </div>

        {topIps.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-400" />
              <p className="text-sm font-semibold text-red-300">Top Failing IPs (last 24h)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topIps.map(t => (
                <span key={t.ip} className="font-mono text-xs bg-red-500/10 text-red-300 border border-red-500/20 px-2.5 py-1 rounded-lg">
                  {t.ip} — <span className="font-bold">{t.count}</span> fails
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {["ALL", "FAILED", "SUCCESS"].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${filter === f ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-transparent border-border text-slate-400 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-800/30 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-center px-4 py-3 w-16">Result</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">IP Address</th>
                  <th className="text-left px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {attempts.map(a => (
                  <tr key={a.id} className={`hover:bg-slate-800/20 transition-colors ${!a.success ? "bg-red-500/[0.02]" : ""}`}>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.success ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {a.success ? "OK" : "FAIL"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300">{a.email}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs font-mono text-slate-500">{a.ip}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-border text-slate-400 hover:text-white disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg border border-border text-slate-400 hover:text-white disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
