"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Shield, Users, AlertTriangle, Activity, CreditCard, Calendar, FileText, LogIn } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Stats {
  users: { total: number; active: number; suspended: number; banned: number; newLast7d: number };
  logins: { failed24h: number; success24h: number };
  events: { total: number; published: number };
  payments: { total: number; pending: number };
  recentAuditLogs: { id: string; action: string; actorEmail: string; targetLabel: string | null; createdAt: string }[];
}

export default function SecurityDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/security/stats").then(r => r.json()).then(d => {
      if (d.data) setStats(d.data);
    }).finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: "Total Users", value: stats.users.total, sub: `+${stats.users.newLast7d} this week`, icon: <Users size={20} />, color: "indigo", href: "/security/users" },
    { label: "Suspended / Banned", value: `${stats.users.suspended} / ${stats.users.banned}`, sub: "Restricted accounts", icon: <Shield size={20} />, color: "red", href: "/security/users?status=SUSPENDED" },
    { label: "Failed Logins (24h)", value: stats.logins.failed24h, sub: `${stats.logins.success24h} successful`, icon: <AlertTriangle size={20} />, color: "amber", href: "/security/login-attempts?filter=FAILED" },
    { label: "Payments", value: stats.payments.total, sub: `${stats.payments.pending} pending`, icon: <CreditCard size={20} />, color: "emerald", href: "/security/payments" },
    { label: "Events", value: stats.events.total, sub: `${stats.events.published} published`, icon: <Calendar size={20} />, color: "violet", href: "/security/events" },
  ] : [];

  const quickLinks = [
    { href: "/security/users", label: "User Management", icon: <Users size={16} />, desc: "Suspend, ban, activate accounts" },
    { href: "/security/login-attempts", label: "Login Attempts", icon: <LogIn size={16} />, desc: "Auth events and brute-force monitoring" },
    { href: "/security/audit-log", label: "Audit Log", icon: <FileText size={16} />, desc: "Full admin action history" },
    { href: "/security/events", label: "Event Moderation", icon: <Calendar size={16} />, desc: "Review and unpublish events" },
    { href: "/security/payments", label: "Payment Monitor", icon: <CreditCard size={16} />, desc: "Transaction oversight" },
  ];

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Shield size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Security Operations</h1>
            <p className="text-slate-400 text-sm">System-wide monitoring and control centre</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {cards.map(card => (
                <Link key={card.label} href={card.href} className={`bg-card border border-border rounded-xl p-5 hover:border-slate-600 transition-colors`}>
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${colorMap[card.color]}`}>
                    {card.icon}
                  </div>
                  <p className="text-2xl font-black text-white">{card.value}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{card.label}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{card.sub}</p>
                </Link>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Quick links */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <Activity size={16} className="text-slate-500" />
                  <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
                </div>
                <div className="divide-y divide-border/50">
                  {quickLinks.map(l => (
                    <Link key={l.href} href={l.href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                        {l.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{l.label}</p>
                        <p className="text-xs text-slate-500">{l.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent audit log */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-white">Recent Audit Events</h2>
                  </div>
                  <Link href="/security/audit-log" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
                </div>
                {stats?.recentAuditLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">No audit events yet</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {stats?.recentAuditLogs.map(log => (
                      <div key={log.id} className="px-5 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-semibold text-amber-400">{log.action}</p>
                          <p className="text-xs text-slate-400 truncate">by {log.actorEmail}{log.targetLabel ? ` → ${log.targetLabel}` : ""}</p>
                        </div>
                        <p className="text-[11px] text-slate-600 shrink-0">{formatDate(log.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
