"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Banknote, Clock, CheckCircle2, XCircle, ArrowUpRight, Download, RotateCcw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Link from "next/link";
import toast from "react-hot-toast";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  platformFee: number | null;
  payoutStatus: string | null;
  createdAt: string;
  guest: { name: string; email: string | null };
  event: { id: string; title: string };
}

interface Summary {
  totalCollected: number;
  totalFees: number;
  totalPaidOut: number;
  pendingPayout: number;
  currency: string;
}

export default function EarningsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);

  const loadEarnings = () => {
    fetch("/api/earnings")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setPayments(d.data.payments);
          setSummary(d.data.summary);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEarnings(); }, []);

  const handleRefund = async (paymentId: string) => {
    if (!confirm("Mark this payment as refunded? This cannot be undone.")) return;
    setRefunding(paymentId);
    try {
      const res = await fetch(`/api/earnings/${paymentId}/refund`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payment marked as refunded");
      loadEarnings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setRefunding(null);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Event", "Guest", "Amount", "Currency", "Platform Fee", "Payout", "Status"],
      ...payments.map(p => [
        new Date(p.createdAt).toLocaleDateString(),
        p.event.title,
        p.guest.name,
        p.amount,
        p.currency,
        p.platformFee ?? 0,
        (p.amount - (p.platformFee ?? 0)),
        p.status,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "eventcraft-earnings.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number, currency = "TZS") =>
    `${currency} ${n.toLocaleString()}`;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Earnings</h1>
            <p className="text-slate-400 text-sm mt-1">Ticket revenue and payout history</p>
          </div>
          {payments.length > 0 && (
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportCSV}>
              Export CSV
            </Button>
          )}
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Collected", value: fmt(summary.totalCollected, summary.currency), icon: TrendingUp, color: "text-indigo-400", bg: "bg-indigo-500/10" },
              { label: "Platform Fees (4%)", value: fmt(summary.totalFees, summary.currency), icon: Banknote, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Paid Out to You", value: fmt(summary.totalPaidOut, summary.currency), icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Pending Payout", value: fmt(summary.pendingPayout, summary.currency), icon: Clock, color: "text-slate-400", bg: "bg-slate-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-5">
                <div className={`inline-flex p-2 rounded-lg ${bg} ${color} mb-3`}>
                  <Icon size={16} />
                </div>
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Setup prompt */}
        {payments.length > 0 && !summary?.totalPaidOut && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Banknote size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Add your payout method</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Set up your mobile money or bank account so EventCraft can send you your earnings automatically.{" "}
                <Link href="/settings/payouts" className="underline hover:text-amber-300">Go to Payout Settings →</Link>
              </p>
            </div>
          </div>
        )}

        {/* Payments table */}
        {payments.length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-20 text-center">
            <Banknote size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No earnings yet</p>
            <p className="text-slate-500 text-sm">Revenue from paid ticket sales will appear here.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Event</th>
                  <th className="text-left">Guest</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Fee (4%)</th>
                  <th className="text-right">You Receive</th>
                  <th className="text-left">Payout</th>
                  <th className="w-8"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const fee = p.platformFee ?? Math.round(p.amount * 0.04);
                  const net = p.amount - fee;
                  const isRefunded = p.status === "REFUNDED";
                  return (
                    <tr key={p.id} className={isRefunded ? "opacity-50" : ""}>
                      <td className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/events/${p.event.id}`} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                          {p.event.title} <ArrowUpRight size={11} />
                        </Link>
                      </td>
                      <td>
                        <p className="text-sm text-white">{p.guest.name}</p>
                        {p.guest.email && <p className="text-xs text-slate-500">{p.guest.email}</p>}
                      </td>
                      <td className="text-right text-sm font-medium text-white">{p.currency} {p.amount.toLocaleString()}</td>
                      <td className="text-right text-sm text-amber-400">{p.currency} {fee.toLocaleString()}</td>
                      <td className="text-right text-sm font-semibold text-emerald-400">{p.currency} {net.toLocaleString()}</td>
                      <td>
                        {isRefunded ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                            <XCircle size={10} /> Refunded
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            p.payoutStatus === "SENT" ? "bg-emerald-500/15 text-emerald-400"
                            : p.payoutStatus === "FAILED" ? "bg-red-500/15 text-red-400"
                            : "bg-slate-500/15 text-slate-400"
                          }`}>
                            {p.payoutStatus === "SENT" ? <CheckCircle2 size={10} /> : p.payoutStatus === "FAILED" ? <XCircle size={10} /> : <Clock size={10} />}
                            {p.payoutStatus ?? "Pending"}
                          </span>
                        )}
                      </td>
                      <td>
                        {!isRefunded && (
                          <button
                            type="button"
                            title="Mark as refunded"
                            disabled={refunding === p.id}
                            onClick={() => handleRefund(p.id)}
                            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
