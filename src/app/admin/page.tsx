"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, CheckCircle2, TrendingUp, Shield,
  Mail, Clock, BarChart2, Activity, Search,
  UserX, UserCheck, Ban, LogOut, Trash2, EyeOff, RefreshCw,
  DollarSign, ArrowUpRight, ArrowDownRight, Hourglass,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { formatDate, getCategoryIcon } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalGuests: number;
  confirmedGuests: number;
  checkedIn: number;
  recentEvents: Array<{
    id: string;
    title: string;
    date: string;
    status: string;
    category: string;
    host: { name: string; email: string };
    _count: { guests: number };
  }>;
  revenue: {
    allTime:     { fees: number; volume: number; transactions: number };
    thisMonth:   { fees: number; volume: number; transactions: number };
    lastMonthFees: number;
    pendingPayouts: { count: number; amount: number };
  };
  planBreakdown: Record<string, number>;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { events: number };
}

const STATUS_PILL: Record<string, string> = {
  ACTIVE:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  SUSPENDED: "bg-amber-500/15  text-amber-400  border-amber-500/20",
  BANNED:    "bg-red-500/15    text-red-400    border-red-500/20",
};

const PLAN_PILL: Record<string, string> = {
  FREE:     "bg-slate-500/15  text-slate-400  border-slate-500/20",
  PRO:      "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  BUSINESS: "bg-amber-500/15  text-amber-400  border-amber-500/20",
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "events">("overview");
  const [userSearch, setUserSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [actingEvent, setActingEvent] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(() => {
    return Promise.all([
      fetch("/api/admin/stats").then(r => r.json()),
      fetch("/api/admin/users?limit=100").then(r => r.json()),
    ]).then(([statsData, usersData]) => {
      if (statsData.error === "Forbidden") { router.push("/dashboard"); return; }
      if (statsData.data) setStats(statsData.data);
      if (usersData.data) setUsers(usersData.data);
    });
  }, [router]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const userAction = async (userId: string, endpoint: string, label: string, reason?: string) => {
    setActing(userId + endpoint);
    try {
      const res = await fetch(`/api/security/users/${userId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || label);
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        if (endpoint === "activate") return { ...u, status: "ACTIVE" };
        if (endpoint === "suspend") return { ...u, status: "SUSPENDED" };
        if (endpoint === "ban") return { ...u, status: "BANNED" };
        return u;
      }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : label + " failed");
    } finally {
      setActing(null);
    }
  };

  const eventAction = async (eventId: string, action: "unpublish" | "delete") => {
    if (action === "delete" && !confirm("Delete this event permanently? This cannot be undone.")) return;
    setActingEvent(eventId + action);
    try {
      if (action === "unpublish") {
        const res = await fetch(`/api/security/events/${eventId}/unpublish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Admin action" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success("Event unpublished");
        setStats(prev => prev ? {
          ...prev,
          recentEvents: prev.recentEvents.map(e => e.id === eventId ? { ...e, status: "DRAFT" } : e),
        } : prev);
      } else {
        const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success("Event deleted");
        setStats(prev => prev ? {
          ...prev,
          recentEvents: prev.recentEvents.filter(e => e.id !== eventId),
        } : prev);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingEvent(null);
    }
  };

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) return null;

  const confirmRate = stats.totalGuests > 0 ? Math.round((stats.confirmedGuests / stats.totalGuests) * 100) : 0;
  const checkinRate = stats.confirmedGuests > 0 ? Math.round((stats.checkedIn / stats.confirmedGuests) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">Platform overview and management</p>
            </div>
          </div>
          <button type="button" onClick={() => load()} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"  value={stats.totalUsers}      icon={<Users size={20} />}       iconColor="text-amber-400" />
          <StatCard label="Total Events" value={stats.totalEvents}     icon={<Calendar size={20} />}    iconColor="text-indigo-400" />
          <StatCard label="Total Guests" value={stats.totalGuests}     icon={<Users size={20} />}       iconColor="text-purple-400" change={`${confirmRate}% confirmed`} changeType={confirmRate > 60 ? "positive" : "neutral"} />
          <StatCard label="Checked In"   value={stats.checkedIn}       icon={<CheckCircle2 size={20} />} iconColor="text-emerald-400" change={`${checkinRate}% of confirmed`} changeType={checkinRate > 50 ? "positive" : "neutral"} />
        </div>

        {/* Rate bars */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">RSVP Confirmation Rate</h3>
              </div>
              <span className="text-2xl font-bold text-emerald-400">{confirmRate}%</span>
            </div>
            <progress value={confirmRate} max={100} aria-label="RSVP confirmation rate"
              className="w-full h-2 rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-700 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-500 [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>{stats.confirmedGuests} confirmed</span>
              <span>{stats.totalGuests} total</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Check-In Rate</h3>
              </div>
              <span className="text-2xl font-bold text-indigo-400">{checkinRate}%</span>
            </div>
            <progress value={checkinRate} max={100} aria-label="Check-in rate"
              className="w-full h-2 rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-700 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-500 [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-indigo-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>{stats.checkedIn} checked in</span>
              <span>{stats.confirmedGuests} confirmed</span>
            </div>
          </div>
        </div>

        {/* ── Revenue metrics ──────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* All-time fees */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All-time Fees</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400"><DollarSign size={14} /></div>
            </div>
            <p className="text-2xl font-black text-amber-400 tracking-tight">
              TZS {(stats.revenue.allTime.fees).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">from {stats.revenue.allTime.transactions} transactions</p>
          </div>

          {/* This month */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month</span>
              {(() => {
                const diff = stats.revenue.thisMonth.fees - stats.revenue.lastMonthFees;
                return diff >= 0
                  ? <ArrowUpRight size={16} className="text-emerald-400" />
                  : <ArrowDownRight size={16} className="text-red-400" />;
              })()}
            </div>
            <p className="text-2xl font-black text-white tracking-tight">
              TZS {stats.revenue.thisMonth.fees.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.revenue.lastMonthFees > 0
                ? `${stats.revenue.thisMonth.fees >= stats.revenue.lastMonthFees ? "+" : ""}${Math.round(((stats.revenue.thisMonth.fees - stats.revenue.lastMonthFees) / stats.revenue.lastMonthFees) * 100)}% vs last month`
                : `${stats.revenue.thisMonth.transactions} transactions`}
            </p>
          </div>

          {/* Ticket volume this month */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Volume</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400"><TrendingUp size={14} /></div>
            </div>
            <p className="text-2xl font-black text-indigo-400 tracking-tight">
              TZS {stats.revenue.thisMonth.volume.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">gross ticket sales this month</p>
          </div>

          {/* Pending payouts */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payouts</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400"><Hourglass size={14} /></div>
            </div>
            <p className="text-2xl font-black text-white tracking-tight">
              TZS {stats.revenue.pendingPayouts.amount.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">{stats.revenue.pendingPayouts.count} payment{stats.revenue.pendingPayouts.count !== 1 ? "s" : ""} awaiting disbursement</p>
          </div>
        </div>

        {/* Plan breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Plan Distribution</h3>
          <div className="flex gap-6 flex-wrap">
            {(["FREE", "PRO", "BUSINESS"] as const).map(plan => {
              const count = stats.planBreakdown[plan] ?? 0;
              const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
              const colors = { FREE: "bg-slate-500", PRO: "bg-indigo-500", BUSINESS: "bg-amber-500" };
              const textColors = { FREE: "text-slate-400", PRO: "text-indigo-400", BUSINESS: "text-amber-400" };
              return (
                <div key={plan} className="flex items-center gap-3 min-w-30">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[plan]}`} />
                  <div>
                    <p className={`text-xs font-bold ${textColors[plan]}`}>{plan}</p>
                    <p className="text-sm font-black text-white">{count} <span className="text-slate-500 font-normal text-xs">({pct}%)</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit mb-6">
            {(["events", "users"] as const).map(tab => (
              <button type="button" key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  activeTab === tab ? "bg-amber-500 text-white shadow-[0_2px_0_0_#92400e]" : "text-slate-400 hover:text-white"
                }`}>
                {tab === "events" ? `Recent Events (${stats.recentEvents.length})` : `Users (${users.length})`}
              </button>
            ))}
          </div>

          {/* ── Events tab ───────────────────────────────────────── */}
          {activeTab === "events" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-white">Recent Events</h3>
              </div>
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="text-left">Event</th>
                    <th className="text-left">Host</th>
                    <th className="text-left hidden sm:table-cell">Date</th>
                    <th className="text-left hidden md:table-cell">Guests</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEvents.map(event => (
                    <tr key={event.id} className="group">
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getCategoryIcon(event.category)}</span>
                          <span className="text-sm font-medium text-white line-clamp-1">{event.title}</span>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm text-slate-300">{event.host.name}</p>
                        <p className="text-xs text-slate-500">{event.host.email}</p>
                      </td>
                      <td className="hidden sm:table-cell text-sm text-slate-400">{formatDate(event.date)}</td>
                      <td className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users size={13} className="text-slate-500" />
                          <span className="text-white">{event._count.guests}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={event.status} /></td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {event.status === "PUBLISHED" && (
                            <button
                              type="button"
                              onClick={() => eventAction(event.id, "unpublish")}
                              disabled={actingEvent === event.id + "unpublish"}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                              title="Unpublish"
                            >
                              <EyeOff size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => eventAction(event.id, "delete")}
                            disabled={actingEvent === event.id + "delete"}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Users tab ────────────────────────────────────────── */}
          {activeTab === "users" && (
            <div className="flex flex-col gap-4">
              <Input
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                icon={<Search size={16} />}
              />
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th className="text-left">User</th>
                      <th className="text-left hidden sm:table-cell">Role / Plan</th>
                      <th className="text-center">Status</th>
                      <th className="text-left hidden lg:table-cell">Last Login</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="group">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${u.role === "ADMIN" ? "bg-amber-500/20 text-amber-400" : "bg-indigo-600/20 text-indigo-400"}`}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{u.name}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                <Mail size={10} />{u.email}
                              </p>
                              <p className="text-xs text-slate-600">{u._count.events} event{u._count.events !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border w-fit ${u.role === "ADMIN" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : u.role === "SECURITY_ADMIN" ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-indigo-500/15 text-indigo-400 border-indigo-500/20"}`}>
                              {u.role}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border w-fit ${PLAN_PILL[u.plan] ?? PLAN_PILL.FREE}`}>
                              {u.plan}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_PILL[u.status] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20"}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={11} />
                            {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status !== "ACTIVE" && (
                              <button type="button" onClick={() => userAction(u.id, "activate", "Activated")}
                                disabled={acting === u.id + "activate"}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                title="Activate">
                                <UserCheck size={14} />
                              </button>
                            )}
                            {u.status !== "SUSPENDED" && u.role === "USER" && (
                              <button type="button" onClick={() => userAction(u.id, "suspend", "Suspended", "Admin review")}
                                disabled={acting === u.id + "suspend"}
                                className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                title="Suspend">
                                <UserX size={14} />
                              </button>
                            )}
                            {u.status !== "BANNED" && u.role === "USER" && (
                              <button type="button" onClick={() => userAction(u.id, "ban", "Banned", "Policy violation")}
                                disabled={acting === u.id + "ban"}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                title="Ban">
                                <Ban size={14} />
                              </button>
                            )}
                            <button type="button" onClick={() => userAction(u.id, "revoke-session", "Session revoked")}
                              disabled={acting === u.id + "revoke-session"}
                              className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors disabled:opacity-50"
                              title="Revoke session">
                              <LogOut size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    {userSearch ? `No users matching "${userSearch}"` : "No users found"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
