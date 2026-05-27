"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AuditEntry {
  id: string; action: string; actorEmail: string;
  targetType: string | null; targetLabel: string | null;
  metadata: string | null; ip: string | null; createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  USER_SUSPENDED: "text-amber-400",
  USER_BANNED: "text-red-400",
  USER_ACTIVATED: "text-emerald-400",
  USER_SESSION_REVOKED: "text-violet-400",
  EVENT_UNPUBLISHED: "text-orange-400",
  ACCOUNT_DELETED: "text-red-500",
  PLAN_CHANGED: "text-indigo-400",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/security/audit-log?page=${page}&limit=50`).then(r => r.json()).then(d => {
      if (d.data) { setLogs(d.data); setTotalPages(d.pagination.pages || 1); }
    }).finally(() => setLoading(false));
  }, [page]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileText size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Log</h1>
            <p className="text-slate-400 text-sm">Complete record of all admin and security actions</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No audit events recorded yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-800/30 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Action</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Actor</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Target</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">IP</th>
                  <th className="text-left px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono font-bold ${ACTION_COLOR[log.action] ?? "text-slate-300"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-slate-400">{log.actorEmail}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {log.targetLabel ? (
                        <span className="text-xs text-slate-300">{log.targetLabel}
                          {log.targetType && <span className="text-slate-600 ml-1">({log.targetType})</span>}
                        </span>
                      ) : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs font-mono text-slate-600">{log.ip ?? "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-border text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg border border-border text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
