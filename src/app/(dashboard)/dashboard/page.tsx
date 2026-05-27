"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  CheckCircle2,
  Plus,
  ArrowRight,
  Clock,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
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
    total: events.length,
    upcoming: events.filter(e => !isEventPast(e.date) && e.status === "PUBLISHED").length,
    totalGuests: events.reduce((acc, e) => acc + (e.guests?.length || 0), 0),
    confirmed: events.reduce((acc, e) => acc + (e.guests?.filter(g => g.status === "CONFIRMED").length || 0), 0),
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold text-white">
              {user?.name?.split(" ")[0] ?? "Welcome"}&apos;s Dashboard
            </h1>
          </div>
          <Link href="/events/new">
            <Button icon={<Plus size={16} />} size="md">
              New Event
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Events"
            value={stats.total}
            icon={<Calendar size={20} />}
            iconColor="text-indigo-400"
            change={stats.total > 0 ? "All time" : "Create your first event"}
            changeType="neutral"
          />
          <StatCard
            label="Upcoming"
            value={stats.upcoming}
            icon={<Clock size={20} />}
            iconColor="text-emerald-400"
            change={stats.upcoming > 0 ? "Published & live" : "No upcoming events"}
            changeType={stats.upcoming > 0 ? "positive" : "neutral"}
          />
          <StatCard
            label="Total Guests"
            value={stats.totalGuests}
            icon={<Users size={20} />}
            iconColor="text-purple-400"
            change="Across all events"
            changeType="neutral"
          />
          <StatCard
            label="Confirmed"
            value={stats.confirmed}
            icon={<CheckCircle2 size={20} />}
            iconColor="text-amber-400"
            change={stats.totalGuests > 0 ? `${Math.round((stats.confirmed / stats.totalGuests) * 100)}% response rate` : "No RSVPs yet"}
            changeType={stats.confirmed > 0 ? "positive" : "neutral"}
          />
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Upcoming Events */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Upcoming Events</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your next scheduled events</p>
              </div>
              <Link href="/events" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Calendar size={24} />
                </div>
                <p className="text-white font-medium mb-1">No upcoming events</p>
                <p className="text-slate-500 text-sm mb-5">Create your first event and start sending invites</p>
                <Link href="/events/new">
                  <Button size="sm" icon={<Plus size={14} />}>Create event</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {upcoming.map((event) => {
                  const confirmed = event.guests?.filter(g => g.status === "CONFIRMED").length || 0;
                  const total = event.guests?.length || 0;
                  const soon = isEventSoon(event.date);

                  return (
                    <Link key={event.id} href={`/events/${event.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-indigo-600/5 transition-colors">
                      <div className="w-11 h-11 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                        {getCategoryIcon(event.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">{event.title}</p>
                          {soon && (
                            <span className="shrink-0 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                              SOON
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={11} /> {formatDate(event.date)}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={11} /> {formatTime(event.date)}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={11} /> {event.location}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white">{confirmed}<span className="text-slate-500 font-normal">/{total}</span></p>
                        <p className="text-xs text-slate-500">confirmed</p>
                      </div>
                      <StatusBadge status={event.status} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Quick actions */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                <Link href="/events/new" className="flex items-center gap-3 p-3 rounded-lg bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                    <Plus size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">New Event</p>
                    <p className="text-xs text-slate-500">AI-powered invite</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </Link>
                <Link href="/checkin" className="flex items-center gap-3 p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">QR Check-In</p>
                    <p className="text-xs text-slate-500">Scan guests at the door</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </Link>
                <Link href="/events" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/60 transition-colors group border border-transparent hover:border-border">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400">
                    <TrendingUp size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">View Analytics</p>
                    <p className="text-xs text-slate-500">RSVP & attendance stats</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
              </div>
            </div>

            {/* Recent events */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Recent Events</h3>
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No events yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recent.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="flex items-center gap-3 group">
                      <span className="text-lg">{getCategoryIcon(event.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">{event.title}</p>
                        <p className="text-xs text-slate-600">{formatDate(event.date)}</p>
                      </div>
                      <StatusBadge status={event.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
