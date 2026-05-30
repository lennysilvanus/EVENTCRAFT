"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, Users, CheckCircle2, Plus, ArrowRight,
  Clock, TrendingUp, MapPin, QrCode, Globe,
} from "lucide-react";
import { StatCard, Card3D } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { formatDate, formatTime, getCategoryIcon, isEventPast, isEventSoon } from "@/lib/utils";
import type { Event } from "@/types";

interface EventWithCount extends Omit<Event, "guests"> {
  guests: { status: string }[];
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/events").then(r => r.json()),
    ]).then(([userData, eventsData]) => {
      if (userData.data) setUser(userData.data);
      if (eventsData.data) setEvents(eventsData.data);
    }).finally(() => setLoading(false));
  }, []);

  const stats = {
    total:       events.length,
    upcoming:    events.filter(e => !isEventPast(e.date) && e.status === "PUBLISHED").length,
    totalGuests: events.reduce((acc, e) => acc + (e.guests?.length || 0), 0),
    confirmed:   events.reduce((acc, e) => acc + (e.guests?.filter(g => g.status === "CONFIRMED").length || 0), 0),
  };

  const upcoming = events
    .filter(e => !isEventPast(e.date) && e.status !== "CANCELLED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const recent = events
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">

        {/* ── Hero header ──────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-indigo-600/20 via-purple-600/5 to-transparent border border-indigo-500/20 px-6 py-7">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-300/80 text-sm font-medium mb-1">{greeting} 👋</p>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {user?.name?.split(" ")[0] ?? "Welcome"}&apos;s Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {stats.upcoming > 0
                  ? `You have ${stats.upcoming} upcoming event${stats.upcoming !== 1 ? "s" : ""}`
                  : "Create your first event to get started"}
              </p>
            </div>
            <Link href="/events/new">
              <Button icon={<Plus size={16} />} size="lg">New Event</Button>
            </Link>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label="Total Events"  value={stats.total}       icon={<Calendar size={20} />}     iconColor="text-indigo-400" change={stats.total > 0 ? "All time" : "Create your first"}   changeType="neutral" />
          <StatCard label="Upcoming"      value={stats.upcoming}    icon={<Clock size={20} />}         iconColor="text-emerald-400" change={stats.upcoming > 0 ? "Published & live" : "None yet"} changeType={stats.upcoming > 0 ? "positive" : "neutral"} />
          <StatCard label="Total Guests"  value={stats.totalGuests} icon={<Users size={20} />}         iconColor="text-purple-400" change="Across all events"                                    changeType="neutral" />
          <StatCard label="Confirmed"     value={stats.confirmed}   icon={<CheckCircle2 size={20} />}  iconColor="text-amber-400"  change={stats.totalGuests > 0 ? `${Math.round((stats.confirmed / stats.totalGuests) * 100)}% rate` : "No RSVPs yet"} changeType={stats.confirmed > 0 ? "positive" : "neutral"} />
        </div>

        {/* ── Main panels ──────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Upcoming Events */}
          <Card3D rounded="xl" intensity="subtle" wrapperClassName="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">Upcoming Events</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Your next scheduled events</p>
                </div>
                <Link href="/events" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors font-semibold">
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                    <Calendar size={24} />
                  </div>
                  <p className="text-white font-semibold mb-1">No upcoming events</p>
                  <p className="text-slate-500 text-sm mb-5">Create your first event and start sending invites</p>
                  <Link href="/events/new"><Button size="sm" icon={<Plus size={14} />}>Create event</Button></Link>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {upcoming.map((event) => {
                    const confirmed    = event.guests?.filter(g => g.status === "CONFIRMED").length || 0;
                    const total        = event.guests?.length || 0;
                    const soon         = isEventSoon(event.date);
                    const confirmRate  = total > 0 ? Math.round((confirmed / total) * 100) : 0;
                    const ev = event as EventWithCount & { coverImage?: string | null };

                    return (
                      <Link key={event.id} href={`/events/${event.id}`}
                        className="group flex items-center gap-4 px-5 py-4 hover:bg-indigo-500/5 transition-colors">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border">
                          {ev.coverImage ? (
                            <img src={ev.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl bg-indigo-600/10">
                              {getCategoryIcon(event.category)}
                            </div>
                          )}
                          {soon && (
                            <div className="absolute inset-0 bg-amber-500/30 flex items-end justify-center pb-0.5">
                              <span className="text-[8px] font-black text-amber-200 uppercase tracking-wider">Soon</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors tracking-tight">{event.title}</p>
                            <StatusBadge status={event.status} />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                            <Calendar size={10} className="text-indigo-400/70 shrink-0" />
                            <span>{formatDate(event.date)}</span>
                            <span className="text-slate-700">·</span>
                            <Clock size={10} className="text-indigo-400/70 shrink-0" />
                            <span>{formatTime(event.date)}</span>
                            <span className="text-slate-700">·</span>
                            <MapPin size={10} className="text-indigo-400/70 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                          {total > 0 && (
                            <div className="flex items-center gap-2">
                              <progress value={confirmRate} max={100} aria-label="Confirmation rate"
                                className="w-20 h-1 rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-500" />
                              <span className="text-[11px] text-slate-500">
                                <span className="text-white font-semibold">{confirmed}</span>/{total} confirmed
                              </span>
                            </div>
                          )}
                        </div>
                        <ArrowRight size={14} className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </Card3D>

          {/* Right column */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Quick actions */}
            <Card3D intensity="subtle">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-black text-white mb-4 tracking-tight">Quick Actions</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { href: "/events/new", label: "New Event",      sub: "AI-powered invite",        icon: <Plus size={16} />,        color: "bg-indigo-600/15 border-indigo-500/20 hover:bg-indigo-600/25", iconBg: "bg-indigo-600/20 text-indigo-400", arrow: "group-hover:text-indigo-400" },
                    { href: "/checkin",    label: "QR Check-In",    sub: "Scan guests at the door",   icon: <QrCode size={16} />,      color: "bg-emerald-600/10 border-emerald-500/20 hover:bg-emerald-600/20", iconBg: "bg-emerald-600/20 text-emerald-400", arrow: "group-hover:text-emerald-400" },
                    { href: "/explore",   label: "Explore Events", sub: "Browse public events",       icon: <Globe size={16} />,       color: "bg-purple-600/10 border-purple-500/20 hover:bg-purple-600/20",   iconBg: "bg-purple-600/20 text-purple-400", arrow: "group-hover:text-purple-400" },
                    { href: "/events",    label: "Analytics",      sub: "RSVP & attendance stats",   icon: <TrendingUp size={16} />,  color: "hover:bg-slate-800/60 border-transparent hover:border-border",    iconBg: "bg-slate-700/60 text-slate-400",   arrow: "group-hover:text-slate-400" },
                  ].map(a => (
                    <Link key={a.href} href={a.href}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors group ${a.color}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.iconBg}`}>{a.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{a.label}</p>
                        <p className="text-xs text-slate-500">{a.sub}</p>
                      </div>
                      <ArrowRight size={14} className={`text-slate-700 transition-colors ${a.arrow}`} />
                    </Link>
                  ))}
                </div>
              </div>
            </Card3D>

            {/* Recent events */}
            <Card3D intensity="subtle">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-black text-white mb-4 tracking-tight">Recent Events</h3>
                {recent.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No events yet</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recent.map((event) => {
                      const ev = event as EventWithCount & { coverImage?: string | null };
                      return (
                        <Link key={event.id} href={`/events/${event.id}`} className="flex items-center gap-3 group">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-border shrink-0">
                            {ev.coverImage ? (
                              <img src={ev.coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg bg-indigo-600/10">
                                {getCategoryIcon(event.category)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate tracking-tight">{event.title}</p>
                            <p className="text-xs text-slate-600">{formatDate(event.date)}</p>
                          </div>
                          <StatusBadge status={event.status} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card3D>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
