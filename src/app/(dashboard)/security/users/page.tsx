"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Shield, Search, UserX, UserCheck, Ban, LogOut, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

interface SecUser {
  id: string; name: string; email: string; role: string; status: string;
  plan: string; createdAt: string; lastLoginAt: string | null; lastLoginIp: string | null;
  _count: { events: number };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  SUSPENDED: "bg-amber-500/15 text-amber-400",
  BANNED: "bg-red-500/15 text-red-400",
};

export default function SecurityUsersPage() {
  const [users, setUsers] = useState<SecUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, status: statusFilter, limit: "100" });
    fetch(`/api/security/users?${params}`).then(r => r.json()).then(d => {
      if (d.data) setUsers(d.data);
    }).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const action = async (userId: string, endpoint: string, label: string, reason?: string) => {
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
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : label + " failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Shield size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 text-sm">Suspend, ban or restore user accounts</p>
          </div>
          <button onClick={load} className="ml-auto text-slate-400 hover:text-white transition-colors p-2">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
          </div>
          <div className="flex gap-2">
            {["ALL", "ACTIVE", "SUSPENDED", "BANNED"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${statusFilter === s ? "bg-red-500/20 border-red-500/40 text-red-300" : "bg-transparent border-border text-slate-400 hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-800/30 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">User</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Role / Plan</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Last Login</th>
                  <th className="text-left px-4 py-3 hidden xl:table-cell">Last IP</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-white">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                      <p className="text-xs text-slate-600">{u._count.events} events · joined {formatDate(u.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs font-mono text-slate-400">{u.role}</span>
                      <span className="mx-1 text-slate-700">/</span>
                      <span className="text-xs text-slate-500">{u.plan}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[u.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-slate-500">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell text-xs font-mono text-slate-600">
                      {u.lastLoginIp ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.status !== "ACTIVE" && (
                          <button onClick={() => action(u.id, "activate", "Activated")}
                            disabled={acting === u.id + "activate"}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50" title="Activate">
                            <UserCheck size={14} />
                          </button>
                        )}
                        {u.status !== "SUSPENDED" && u.role === "USER" && (
                          <button onClick={() => action(u.id, "suspend", "Suspended", "Security review")}
                            disabled={acting === u.id + "suspend"}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50" title="Suspend">
                            <UserX size={14} />
                          </button>
                        )}
                        {u.status !== "BANNED" && u.role === "USER" && (
                          <button onClick={() => action(u.id, "ban", "Banned", "Policy violation")}
                            disabled={acting === u.id + "ban"}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50" title="Ban">
                            <Ban size={14} />
                          </button>
                        )}
                        <button onClick={() => action(u.id, "revoke-session", "Session revoked")}
                          disabled={acting === u.id + "revoke-session"}
                          className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors disabled:opacity-50" title="Revoke session">
                          <LogOut size={14} />
                        </button>
                      </div>
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
