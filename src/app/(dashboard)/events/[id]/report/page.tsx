"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Users, CheckCircle2, Clock, XCircle,
  DollarSign, BarChart2, Tag, Utensils, Download,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { formatDate, formatTime, getCategoryIcon } from "@/lib/utils";

interface ReportData {
  event: { id: string; title: string; date: string; location: string; category: string };
  stats: {
    total: number; confirmed: number; declined: number; pending: number;
    checkedIn: number; plusOnes: number; rsvpRate: number; attendanceRate: number; noShowRate: number;
  };
  revenue: { total: number; currency: string; ticketsSold: number };
  timeline: { hour: string; count: number }[];
  dietary: { req: string; count: number }[];
  tags: { tag: string; count: number }[];
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-300 w-40 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/events/${id}/report`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setReport(d.data);
      })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExportCSV = () => {
    if (!report) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Invited", report.stats.total],
      ["Confirmed", report.stats.confirmed],
      ["Declined", report.stats.declined],
      ["Pending", report.stats.pending],
      ["Checked In", report.stats.checkedIn],
      ["Plus Ones", report.stats.plusOnes],
      ["RSVP Rate", `${report.stats.rsvpRate}%`],
      ["Attendance Rate", `${report.stats.attendanceRate}%`],
      ["No-Show Rate", `${report.stats.noShowRate}%`],
      ["Revenue", `${report.revenue.currency} ${report.revenue.total.toFixed(2)}`],
      ["Tickets Sold", report.revenue.ticketsSold],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${report.event.title.replace(/[^a-z0-9]/gi, "_")}_report.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/events/${id}`}>
              <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>Back</Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Event Report</h1>
              {report && (
                <p className="text-slate-400 text-sm mt-0.5">
                  {getCategoryIcon(report.event.category)} {report.event.title} · {formatDate(report.event.date)}
                </p>
              )}
            </div>
          </div>
          {report && (
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>
              Export CSV
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-400">{error}</div>
        )}

        {report && (
          <>
            {/* Core Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Invited" value={report.stats.total} icon={<Users size={16} className="text-slate-400" />} color="text-white" />
              <StatCard label="Confirmed" value={report.stats.confirmed} sub={`${report.stats.rsvpRate}% rate`} icon={<CheckCircle2 size={16} className="text-emerald-400" />} color="text-emerald-400" />
              <StatCard label="Checked In" value={report.stats.checkedIn} sub={`${report.stats.attendanceRate}% attended`} icon={<TrendingUp size={16} className="text-indigo-400" />} color="text-indigo-400" />
              <StatCard label="No-Shows" value={report.stats.confirmed - report.stats.checkedIn} sub={`${report.stats.noShowRate}% rate`} icon={<XCircle size={16} className="text-red-400" />} color="text-red-400" />
            </div>

            {/* Attendance funnel */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-400" /> Attendance Funnel
              </h2>
              <div className="flex flex-col gap-4">
                <BarRow label="Invited" count={report.stats.total} max={report.stats.total} color="bg-slate-600" />
                <BarRow label="Confirmed" count={report.stats.confirmed} max={report.stats.total} color="bg-indigo-500" />
                <BarRow label="Checked In" count={report.stats.checkedIn} max={report.stats.total} color="bg-emerald-500" />
                <BarRow label="Declined" count={report.stats.declined} max={report.stats.total} color="bg-red-500" />
                {report.stats.plusOnes > 0 && (
                  <BarRow label="Plus Ones" count={report.stats.plusOnes} max={report.stats.total} color="bg-amber-500" />
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Check-in Timeline */}
              {report.timeline.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-amber-400" /> Check-in Timeline
                  </h2>
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const maxCount = Math.max(...report.timeline.map(t => t.count));
                      return report.timeline.map(({ hour, count }) => (
                        <BarRow
                          key={hour}
                          label={formatTime(hour)}
                          count={count}
                          max={maxCount}
                          color="bg-amber-500"
                        />
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Dietary */}
              {report.dietary.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Utensils size={16} className="text-emerald-400" /> Dietary Requirements
                  </h2>
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const maxCount = report.dietary[0]?.count ?? 1;
                      return report.dietary.map(({ req, count }) => (
                        <BarRow key={req} label={req} count={count} max={maxCount} color="bg-emerald-500" />
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Tags */}
              {report.tags.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag size={16} className="text-indigo-400" /> Guest Tags
                  </h2>
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const maxCount = report.tags[0]?.count ?? 1;
                      return report.tags.map(({ tag, count }) => (
                        <BarRow key={tag} label={tag} count={count} max={maxCount} color="bg-indigo-500" />
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Revenue */}
              {report.revenue.ticketsSold > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-400" /> Revenue
                  </h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
                      <p className="text-3xl font-black text-emerald-400">
                        {report.revenue.currency} {report.revenue.total.toFixed(2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Tickets Sold</p>
                        <p className="text-xl font-bold text-white">{report.revenue.ticketsSold}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Avg per Ticket</p>
                        <p className="text-xl font-bold text-white">
                          {report.revenue.currency} {report.revenue.ticketsSold > 0
                            ? (report.revenue.total / report.revenue.ticketsSold).toFixed(2)
                            : "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary text */}
            <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-xl p-5">
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="font-semibold text-white">{report.event.title}</span> had{" "}
                <span className="text-indigo-400 font-semibold">{report.stats.confirmed} confirmed guests</span> out of{" "}
                {report.stats.total} invited ({report.stats.rsvpRate}% RSVP rate).{" "}
                {report.stats.checkedIn > 0 && (
                  <>
                    <span className="text-emerald-400 font-semibold">{report.stats.checkedIn} guests</span> checked
                    in ({report.stats.attendanceRate}% attendance rate).{" "}
                  </>
                )}
                {report.revenue.ticketsSold > 0 && (
                  <>
                    Revenue collected:{" "}
                    <span className="text-emerald-400 font-semibold">
                      {report.revenue.currency} {report.revenue.total.toFixed(2)}
                    </span> from {report.revenue.ticketsSold} paid tickets.
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
