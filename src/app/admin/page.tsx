"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, CheckCircle2, TrendingUp, Shield,
  Mail, Clock, BarChart2, Activity,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { events: number };
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "events">("overview");
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then(r => r.json()),
      fetch("/api/admin/users").then(r => r.json()),
    ]).then(([statsData, usersData]) => {
      if (statsData.error === "Forbidden") { router.push("/dashboard"); return; }
      if (statsData.data) setStats(statsData.data);
      if (usersData.data) setUsers(usersData.data);
    }).finally(() => setLoading(false));
  }, [router]);

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm">Platform overview and management</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} icon={<Users size={20} />} iconColor="text-amber-400" />
          <StatCard label="Total Events" value={stats.totalEvents} icon={<Calendar size={20} />} iconColor="text-indigo-400" />
          <StatCard label="Total Guests" value={stats.totalGuests} icon={<Users size={20} />} iconColor="text-purple-400" change={`${confirmRate}% confirmed`} changeType={confirmRate > 60 ? "positive" : "neutral"} />
          <StatCard label="Checked In" value={stats.checkedIn} icon={<CheckCircle2 size={20} />} iconColor="text-emerald-400" change={`${checkinRate}% of confirmed`} changeType={checkinRate > 50 ? "positive" : "neutral"} />
        </div>

        {/* Rates */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">RSVP Confirmation Rate</h3>
              </div>
              <span className="text-2xl font-bold text-emerald-400">{confirmRate}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${confirmRate}%` }} />
            </div>
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
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${checkinRate}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>{stats.checkedIn} checked in</span>
              <span>{stats.confirmedGuests} confirmed</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit mb-6">
            {(["events", "users"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  activeTab === tab ? "bg-amber-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "events" ? `Recent Events (${stats.recentEvents.length})` : `Users (${users.length})`}
              </button>
            ))}
          </div>

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
                    <th className="text-left">Date</th>
                    <th className="text-left">Guests</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEvents.map(event => (
                    <tr key={event.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{getCategoryIcon(event.category)}</span>
                          <span className="text-sm font-medium text-white">{event.title}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="text-sm text-slate-300">{event.host.name}</p>
                          <p className="text-xs text-slate-500">{event.host.email}</p>
                        </div>
                      </td>
                      <td className="text-sm text-slate-400">{formatDate(event.date)}</td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users size={13} className="text-slate-500" />
                          <span className="text-white">{event._count.guests}</span>
                        </div>
                      </td>
                      <td><StatusBadge status={event.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "users" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-white">All Users</h3>
              </div>
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="text-left">User</th>
                    <th className="text-left">Role</th>
                    <th className="text-left">Events</th>
                    <th className="text-left">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${user.role === "ADMIN" ? "bg-amber-500/20 text-amber-400" : "bg-indigo-600/20 text-indigo-400"}`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1"><Mail size={10} />{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${user.role === "ADMIN" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-indigo-400 bg-indigo-400/10 border-indigo-400/20"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm">
                          <BarChart2 size={13} className="text-slate-500" />
                          <span className="text-white">{user._count.events}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-sm text-slate-400">
                          <Clock size={13} />
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
