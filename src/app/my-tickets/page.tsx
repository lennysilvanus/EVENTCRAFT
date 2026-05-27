"use client";

import { useState } from "react";
import { Sparkles, Mail, Calendar, MapPin, Clock, QrCode, Download, Search, Ticket } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatDate, formatTime, getCategoryIcon } from "@/lib/utils";

interface MyTicket {
  id: string;
  name: string;
  status: string;
  checkedIn: boolean;
  qrToken: string;
  event: {
    id: string; title: string; date: string; location: string;
    category: string; status: string; host: { name: string };
  };
  payment: { status: string; amount: number; currency: string } | null;
}

export default function MyTicketsPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [tickets, setTickets] = useState<MyTicket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/my-tickets?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data.data);
      setSubmitted(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const upcoming = tickets?.filter(t => new Date(t.event.date) >= new Date()) ?? [];
  const past = tickets?.filter(t => new Date(t.event.date) < new Date()) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-600/10 to-transparent pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 py-12">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">EventCraft</span>
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Ticket size={24} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">My Invitations</h1>
          <p className="text-slate-400 text-sm">Enter the email you used to RSVP to find all your tickets and invitations.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="your@email.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookup()}
                icon={<Mail size={16} />}
              />
            </div>
            <Button onClick={lookup} loading={loading} icon={<Search size={16} />}>
              Find
            </Button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        {tickets !== null && (
          <div className="flex flex-col gap-6">
            {tickets.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl">
                <Ticket size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">No tickets found</p>
                <p className="text-slate-500 text-sm">No RSVPs found for <strong className="text-slate-300">{submitted}</strong></p>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Upcoming ({upcoming.length})</p>
                    <div className="flex flex-col gap-3">
                      {upcoming.map(t => <TicketCard key={t.id} ticket={t} />)}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Past Events ({past.length})</p>
                    <div className="flex flex-col gap-3 opacity-60">
                      {past.map(t => <TicketCard key={t.id} ticket={t} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-8">
          Hosting events? <Link href="/register" className="text-indigo-400 hover:text-indigo-300">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: MyTicket }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 flex gap-4 ${ticket.checkedIn ? "border-emerald-500/20" : ""}`}>
      <div className="text-3xl shrink-0 pt-1">{getCategoryIcon(ticket.event.category)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-sm font-semibold text-white">{ticket.event.title}</p>
            <p className="text-xs text-slate-500">Hosted by {ticket.event.host.name}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            ticket.checkedIn ? "bg-emerald-500/15 text-emerald-400" :
            ticket.status === "CONFIRMED" ? "bg-indigo-500/15 text-indigo-400" :
            ticket.status === "DECLINED" ? "bg-red-500/15 text-red-400" :
            "bg-amber-500/15 text-amber-400"
          }`}>
            {ticket.checkedIn ? "Attended" : ticket.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(ticket.event.date)}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{formatTime(ticket.event.date)}</span>
          <span className="flex items-center gap-1"><MapPin size={11} />{ticket.event.location}</span>
        </div>
        {ticket.payment && (
          <p className="text-xs text-slate-500 mb-3">
            Ticket: {ticket.payment.currency} {ticket.payment.amount.toFixed(2)} •{" "}
            <span className={ticket.payment.status === "COMPLETED" ? "text-emerald-400" : "text-amber-400"}>
              {ticket.payment.status}
            </span>
          </p>
        )}
        {ticket.status === "CONFIRMED" && (
          <div className="flex gap-2">
            <Link href={`/ticket/${ticket.qrToken}`} target="_blank">
              <Button size="sm" icon={<QrCode size={12} />}>View Ticket</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
