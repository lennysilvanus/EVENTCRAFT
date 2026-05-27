"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SecPayment {
  id: string; amount: number; currency: string; status: string; provider: string;
  snippeId: string | null; createdAt: string;
  guest: { name: string; email: string | null };
  event: { title: string; host: { name: string; email: string } };
}
interface Summary { totalRevenue: number; pending: number; }

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-400",
  PENDING: "bg-amber-500/15 text-amber-400",
  REFUNDED: "bg-violet-500/15 text-violet-400",
  FAILED: "bg-red-500/15 text-red-400",
};

export default function SecurityPaymentsPage() {
  const [payments, setPayments] = useState<SecPayment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/security/payments?page=${page}&limit=50`).then(r => r.json()).then(d => {
      if (d.data) { setPayments(d.data); setTotalPages(d.pagination.pages || 1); }
      if (d.summary) setSummary(d.summary);
    }).finally(() => setLoading(false));
  }, [page]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CreditCard size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Payment Monitor</h1>
            <p className="text-slate-400 text-sm">Transaction oversight across all events</p>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
              <p className="text-2xl font-black text-emerald-400">TZS {summary.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl font-black text-amber-400">{summary.pending}</p>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No payments recorded</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-800/30 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Guest</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Event / Host</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-white">{p.guest.name}</p>
                      <p className="text-xs text-slate-500">{p.guest.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-xs text-slate-300 line-clamp-1">{p.event.title}</p>
                      <p className="text-xs text-slate-500">{p.event.host.name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold text-white">
                      {p.currency} {p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-500">{formatDate(p.createdAt)}</td>
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
