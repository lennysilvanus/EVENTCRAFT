"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar, MapPin, Users, QrCode, Share2, Trash2, Edit2,
  CheckCircle2, XCircle, Clock, MessageCircle, Plus, Copy,
  Download, ArrowLeft, Globe, Lock, UserCheck, AlertCircle,
  ExternalLink, Upload, Activity, Mail, ChevronDown, X,
  BarChart2, UserPlus, Copy as CopyIcon, Shield, Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { formatDateTime, formatDate, formatTime, getCategoryIcon, generateWhatsAppShareLink, getEventStatusColor } from "@/lib/utils";
import type { Event, Guest } from "@/types";

interface EventDetail extends Omit<Event, "host" | "inviteLinks"> {
  guests: Guest[];
  host: { name: string; email: string };
  inviteLinks: { id: string; token: string; label: string | null; usageCount: number; isActive: boolean }[];
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "guests" | "share">("overview");
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showQR, setShowQR] = useState<{ guest: Guest; qr: string } | null>(null);
  const [newGuest, setNewGuest] = useState({ name: "", email: "", phone: "", plusOne: false });
  const [addingGuest, setAddingGuest] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [sendInvites, setSendInvites] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sendInviteOnAdd, setSendInviteOnAdd] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyFilter, setNotifyFilter] = useState("CONFIRMED");
  const [notifying, setNotifying] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; role: string; user: { id: string; name: string; email: string } }[]>([]);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState("VIEWER");
  const [addingMember, setAddingMember] = useState(false);

  const fetchEvent = useCallback(() => {
    fetch(`/api/events/${id}`).then(r => r.json()).then(d => {
      if (d.data) setEvent(d.data);
      else toast.error("Event not found");
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/events/${id}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvent(e => e ? { ...e, status: data.data.status } : e);
      toast.success(data.data.status === "PUBLISHED" ? "Event published!" : "Event unpublished");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/events/${id}`, { method: "DELETE" });
      toast.success("Event deleted");
      router.push("/events");
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  };

  const toggleSelect = (guestId: string) => {
    setSelectedGuests(prev => {
      const next = new Set(prev);
      next.has(guestId) ? next.delete(guestId) : next.add(guestId);
      return next;
    });
  };

  const toggleSelectAll = (guests: Guest[]) => {
    setSelectedGuests(prev =>
      prev.size === guests.length ? new Set() : new Set(guests.map(g => g.id))
    );
  };

  const bulkAction = async (action: "CONFIRMED" | "DECLINED" | "delete") => {
    if (selectedGuests.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedGuests);
      if (action === "delete") {
        await Promise.all(ids.map(gid =>
          fetch(`/api/events/${id}/guests/${gid}`, { method: "DELETE" })
        ));
        setEvent(e => e ? { ...e, guests: e.guests.filter(g => !selectedGuests.has(g.id)) } : e);
        toast.success(`Removed ${ids.length} guest${ids.length !== 1 ? "s" : ""}`);
      } else {
        await Promise.all(ids.map(gid =>
          fetch(`/api/events/${id}/guests/${gid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action }),
          })
        ));
        setEvent(e => e ? {
          ...e,
          guests: e.guests.map(g => selectedGuests.has(g.id) ? { ...g, status: action } : g),
        } : e);
        toast.success(`${action === "CONFIRMED" ? "Confirmed" : "Declined"} ${ids.length} guest${ids.length !== 1 ? "s" : ""}`);
      }
      setSelectedGuests(new Set());
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes("name") || firstLine.includes("email");
    const rows = hasHeader ? lines.slice(1) : lines;
    return rows.map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      return { name: cols[0] ?? "", email: cols[1] ?? "", phone: cols[2] ?? "" };
    }).filter(r => r.name);
  };

  const handleCSVChange = (text: string) => {
    setCsvText(text);
    setCsvPreview(parseCSV(text));
  };

  const handleImport = async () => {
    if (csvPreview.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/events/${id}/guests/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: csvPreview, sendInvites }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setShowImport(false);
      setCsvText("");
      setCsvPreview([]);
      fetchEvent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleAddGuest = async () => {
    if (!newGuest.name.trim()) { toast.error("Guest name is required"); return; }
    setAddingGuest(true);
    try {
      const res = await fetch(`/api/events/${id}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newGuest, sendInvite: sendInviteOnAdd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvent(e => e ? { ...e, guests: [data.data, ...e.guests] } : e);
      setNewGuest({ name: "", email: "", phone: "", plusOne: false });
      setShowAddGuest(false);
      toast.success("Guest added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add guest");
    } finally {
      setAddingGuest(false);
    }
  };

  const updateGuestStatus = async (guestId: string, status: "PENDING" | "CONFIRMED" | "DECLINED") => {
    try {
      const res = await fetch(`/api/events/${id}/guests/${guestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvent(e => e ? { ...e, guests: e.guests.map(g => g.id === guestId ? { ...g, status } : g) } : e);
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const removeGuest = async (guestId: string) => {
    if (!confirm("Remove this guest?")) return;
    try {
      await fetch(`/api/events/${id}/guests/${guestId}`, { method: "DELETE" });
      setEvent(e => e ? { ...e, guests: e.guests.filter(g => g.id !== guestId) } : e);
      toast.success("Guest removed");
    } catch {
      toast.error("Failed to remove guest");
    }
  };

  const loadQR = async (guest: Guest) => {
    try {
      const res = await fetch(`/api/qr/${guest.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowQR({ guest, qr: data.data.qrCode });
    } catch {
      toast.error("Failed to generate QR code");
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const shareWhatsApp = () => {
    if (!event) return;
    const inviteUrl = `${window.location.origin}/invite/${event.inviteToken}`;
    const msg = `${event.inviteText || `You're invited to ${event.title}!`}\n\n📅 ${formatDateTime(event.date)}\n📍 ${event.location}\n\nRSVP here: ${inviteUrl}`;
    window.open(generateWhatsAppShareLink(msg), "_blank");
  };

  const createInviteLink = async () => {
    try {
      const res = await fetch(`/api/events/${id}/invite-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Shared link" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvent(e => e ? { ...e, inviteLinks: [...(e.inviteLinks || []), data.data] } : e);
      toast.success("New invite link created");
    } catch {
      toast.error("Failed to create link");
    }
  };

  const handleNotify = async () => {
    setNotifying(true);
    try {
      const res = await fetch(`/api/events/${id}/guests/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: notifyMessage || undefined, filter: notifyFilter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Sent to ${data.data.sent} of ${data.data.total} guests`);
      setShowNotify(false);
      setNotifyMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setNotifying(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/events/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Event duplicated as draft");
      router.push(`/events/${data.data.id}`);
    } catch {
      toast.error("Failed to duplicate event");
      setDuplicating(false);
    }
  };

  const loadTeam = async () => {
    try {
      const res = await fetch(`/api/events/${id}/team`);
      const data = await res.json();
      if (data.data) setTeamMembers(data.data);
    } catch { /* silent */ }
  };

  const handleAddMember = async () => {
    if (!teamEmail.trim()) { toast.error("Enter an email address"); return; }
    setAddingMember(true);
    try {
      const res = await fetch(`/api/events/${id}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: teamEmail, role: teamRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeamMembers(prev => [...prev, data.data]);
      setTeamEmail("");
      toast.success("Team member added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/events/${id}/team/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <AlertCircle size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Event not found</p>
          <Link href="/events"><Button variant="ghost">Back to Events</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const confirmed = event.guests.filter(g => g.status === "CONFIRMED").length;
  const declined = event.guests.filter(g => g.status === "DECLINED").length;
  const pending = event.guests.filter(g => g.status === "PENDING").length;
  const checkedIn = event.guests.filter(g => g.checkedIn).length;
  const total = event.guests.length;

  const filteredGuests = event.guests.filter(g =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
    (g.email?.toLowerCase().includes(guestSearch.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Back + Header */}
        <div>
          <Link href="/events" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft size={15} /> Back to Events
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-2xl shrink-0">
                {getCategoryIcon(event.category)}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-white">{event.title}</h1>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><Calendar size={14} />{formatDate(event.date)}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} />{formatTime(event.date)}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} />{event.location}</span>
                  <span className="flex items-center gap-1.5">{event.isPublic ? <Globe size={14} /> : <Lock size={14} />}{event.isPublic ? "Public" : "Private"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/events/${id}/live`}>
                <Button variant="outline" size="sm" icon={<Activity size={14} className="text-emerald-400" />}>
                  Live
                </Button>
              </Link>
              <Link href={`/events/${id}/report`}>
                <Button variant="outline" size="sm" icon={<BarChart2 size={14} className="text-indigo-400" />}>
                  Report
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { loadTeam(); setShowTeam(true); }}
                icon={<Users size={14} />}
              >
                Team
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                loading={duplicating}
                icon={<Copy size={14} />}
              >
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePublish}
                loading={publishing}
                icon={event.status === "PUBLISHED" ? <Lock size={14} /> : <Globe size={14} />}
              >
                {event.status === "PUBLISHED" ? "Unpublish" : "Publish"}
              </Button>
              <Link href={`/events/${id}/edit`}>
                <Button variant="outline" size="sm" icon={<Edit2 size={14} />}>Edit</Button>
              </Link>
              <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting} icon={<Trash2 size={14} />}>
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Confirmed", value: confirmed, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Pending", value: pending, color: "text-amber-400", bg: "bg-amber-400/10" },
            { label: "Declined", value: declined, color: "text-red-400", bg: "bg-red-400/10" },
            { label: "Checked In", value: checkedIn, color: "text-indigo-400", bg: "bg-indigo-400/10" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">{label}</p>
              <div className="flex items-end justify-between">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500">/{total}</p>
              </div>
              {total > 0 && (
                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${bg.replace("/10", "")} rounded-full`} style={{ width: `${Math.round((value / total) * 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
          {(["overview", "guests", "share"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
              {tab === "guests" && ` (${total})`}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Event Details</h3>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex gap-3">
                  <Calendar size={16} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-slate-400">Date & Time</p>
                    <p className="text-white">{formatDateTime(event.date)}</p>
                    {event.endDate && <p className="text-slate-500 text-xs">Until {formatDateTime(event.endDate)}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin size={16} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-slate-400">Location</p>
                    <p className="text-white">{event.location}</p>
                    {event.address && <p className="text-slate-500 text-xs">{event.address}</p>}
                  </div>
                </div>
                {event.dressCode && (
                  <div className="flex gap-3">
                    <Users size={16} className="text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-400">Dress Code</p>
                      <p className="text-white">{event.dressCode}</p>
                    </div>
                  </div>
                )}
                {event.maxGuests && (
                  <div className="flex gap-3">
                    <Users size={16} className="text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-400">Capacity</p>
                      <p className="text-white">{confirmed} / {event.maxGuests} guests</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {event.inviteText && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Invitation Text</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{event.inviteText}</p>
                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  <Button size="sm" variant="ghost" onClick={shareWhatsApp} icon={<MessageCircle size={14} />}>
                    Share via WhatsApp
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyInviteLink(event.inviteToken)} icon={<Copy size={14} />}>
                    Copy Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guests Tab */}
        {activeTab === "guests" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search guests..."
                    value={guestSearch}
                    onChange={e => setGuestSearch(e.target.value)}
                    icon={<Users size={15} />}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowImport(true)} icon={<Upload size={14} />}>
                    Import CSV
                  </Button>
                  {event.guests.length > 0 && (
                    <a href={`/api/events/${id}/guests/export`} download>
                      <Button size="sm" variant="outline" icon={<Download size={14} />}>
                        Export CSV
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setShowNotify(true)} icon={<Mail size={14} />}>
                    Notify Guests
                  </Button>
                  <Button size="sm" onClick={() => setShowAddGuest(true)} icon={<Plus size={14} />}>
                    Add Guest
                  </Button>
                </div>
              </div>
              {/* Bulk action bar */}
              {selectedGuests.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
                  <span className="text-sm font-medium text-indigo-300">{selectedGuests.size} selected</span>
                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" variant="secondary" loading={bulkLoading} onClick={() => bulkAction("CONFIRMED")} icon={<CheckCircle2 size={13} />}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" loading={bulkLoading} onClick={() => bulkAction("DECLINED")} icon={<XCircle size={13} />}>
                      Decline
                    </Button>
                    <Button size="sm" variant="danger" loading={bulkLoading} onClick={() => bulkAction("delete")} icon={<Trash2 size={13} />}>
                      Remove
                    </Button>
                    <button type="button" aria-label="Clear selection" onClick={() => setSelectedGuests(new Set())} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {filteredGuests.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No guests yet</p>
                <p className="text-slate-600 text-sm mt-1">Add guests or share the invite link</p>
              </div>
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all guests"
                        checked={selectedGuests.size === filteredGuests.length && filteredGuests.length > 0}
                        onChange={() => toggleSelectAll(filteredGuests)}
                        className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left">Guest</th>
                    <th className="text-left">Contact</th>
                    <th className="text-left">Status</th>
                    <th className="text-left">Check-In</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map(guest => (
                    <tr key={guest.id} className={`group ${selectedGuests.has(guest.id) ? "bg-indigo-600/5" : ""}`}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${guest.name}`}
                          checked={selectedGuests.has(guest.id)}
                          onChange={() => toggleSelect(guest.id)}
                          className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${selectedGuests.has(guest.id) ? "bg-indigo-600/40 text-indigo-300" : "bg-indigo-600/20 text-indigo-400"}`}>
                            {guest.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{guest.name}</p>
                            {guest.plusOne && <p className="text-xs text-slate-500">+1 guest</p>}
                            {guest.tier && (
                              <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 mt-0.5">
                                {guest.tier.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {guest.email && <p className="text-slate-300">{guest.email}</p>}
                          {guest.phone && <p className="text-slate-500 text-xs">{guest.phone}</p>}
                          {!guest.email && !guest.phone && <p className="text-slate-600">—</p>}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={guest.status} />
                      </td>
                      <td>
                        {guest.checkedIn ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <UserCheck size={13} /> Checked in
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">Not checked in</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {guest.status !== "CONFIRMED" && (
                            <button type="button" onClick={() => updateGuestStatus(guest.id, "CONFIRMED")} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors" title="Confirm">
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          {guest.status !== "DECLINED" && (
                            <button type="button" onClick={() => updateGuestStatus(guest.id, "DECLINED")} className="p-1.5 rounded text-red-400 hover:bg-red-400/10 transition-colors" title="Decline">
                              <XCircle size={15} />
                            </button>
                          )}
                          <button type="button" onClick={() => loadQR(guest)} className="p-1.5 rounded text-indigo-400 hover:bg-indigo-400/10 transition-colors" title="QR Ticket">
                            <QrCode size={15} />
                          </button>
                          {guest.email && (
                            <a href={`mailto:${guest.email}`} className="p-1.5 rounded text-slate-400 hover:bg-slate-400/10 transition-colors" title="Email guest">
                              <Mail size={15} />
                            </a>
                          )}
                          {guest.phone && (
                            <a href={`https://wa.me/${guest.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-green-400 hover:bg-green-400/10 transition-colors" title="WhatsApp">
                              <MessageCircle size={15} />
                            </a>
                          )}
                          <button type="button" onClick={() => removeGuest(guest.id)} className="p-1.5 rounded text-red-400 hover:bg-red-400/10 transition-colors" title="Remove">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Share Tab */}
        {activeTab === "share" && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Main invite link */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-1">Event Invite Link</h3>
              <p className="text-xs text-slate-500 mb-4">Share this link with guests to RSVP</p>

              {event.status !== "PUBLISHED" && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                  <AlertCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">Publish the event before sharing so guests can RSVP</p>
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-slate-800 border border-border rounded-lg px-3 py-2.5 text-xs text-slate-400 font-mono truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}/invite/${event.inviteToken}` : `/invite/${event.inviteToken}`}
                </div>
                <Button size="sm" onClick={() => copyInviteLink(event.inviteToken)} icon={<Copy size={14} />}>
                  Copy
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={shareWhatsApp} icon={<MessageCircle size={16} />} className="w-full">
                  Share via WhatsApp
                </Button>
                <Link href={`/invite/${event.inviteToken}`} target="_blank" className="w-full">
                  <Button variant="outline" icon={<ExternalLink size={16} />} className="w-full">
                    Preview Invite Page
                  </Button>
                </Link>
              </div>
            </div>

            {/* Custom invite links */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Custom Links</h3>
                  <p className="text-xs text-slate-500">Trackable links for different channels</p>
                </div>
                <Button size="sm" variant="outline" onClick={createInviteLink} icon={<Plus size={14} />}>
                  New Link
                </Button>
              </div>

              {(event.inviteLinks || []).length === 0 ? (
                <div className="text-center py-8">
                  <Share2 size={24} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No custom links yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(event.inviteLinks || []).map(link => (
                    <div key={link.id} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 font-mono truncate">/invite/{link.token.slice(0, 12)}...</p>
                        <p className="text-xs text-slate-600 mt-0.5">{link.usageCount} uses</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => copyInviteLink(link.token)} icon={<Copy size={12} />} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Guest Modal */}
      <Modal isOpen={showAddGuest} onClose={() => setShowAddGuest(false)} title="Add Guest" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Input label="Full Name *" placeholder="Jane Smith" value={newGuest.name} onChange={e => setNewGuest(g => ({ ...g, name: e.target.value }))} />
          <Input label="Email" type="email" placeholder="jane@example.com" value={newGuest.email} onChange={e => setNewGuest(g => ({ ...g, email: e.target.value }))} />
          <Input label="Phone (WhatsApp)" placeholder="+1 234 567 8900" value={newGuest.phone} onChange={e => setNewGuest(g => ({ ...g, phone: e.target.value }))} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={newGuest.plusOne} onChange={e => setNewGuest(g => ({ ...g, plusOne: e.target.checked }))} className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-sm text-slate-300">Bringing a +1</span>
          </label>
          {newGuest.email && (
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
              <input type="checkbox" checked={sendInviteOnAdd} onChange={e => setSendInviteOnAdd(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
              <div>
                <p className="text-sm text-indigo-300 font-medium flex items-center gap-1.5"><Mail size={13} /> Send invite email</p>
                <p className="text-xs text-slate-500 mt-0.5">Guest receives invite link by email</p>
              </div>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddGuest(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddGuest} loading={addingGuest} className="flex-1">Add Guest</Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      {showQR && (
        <Modal isOpen={!!showQR} onClose={() => setShowQR(null)} title={`QR Ticket — ${showQR.guest.name}`} size="sm">
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <img src={showQR.qr} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-slate-500 text-center">Scan at check-in to mark {showQR.guest.name} as arrived</p>
            <div className="flex flex-col gap-2 w-full">
              <a href={`/ticket/${showQR.guest.qrToken}`} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button icon={<ExternalLink size={14} />} className="w-full">View Full Ticket Card</Button>
              </a>
              <div className="flex gap-2">
                <a href={showQR.qr} download={`ticket-${showQR.guest.name}.png`} className="flex-1">
                  <Button variant="outline" icon={<Download size={14} />} className="w-full">QR Only</Button>
                </a>
                <Button
                  variant="outline"
                  className="flex-1"
                  icon={<MessageCircle size={14} />}
                  onClick={() => {
                    if (showQR.guest.phone) {
                      const ticketUrl = `${window.location.origin}/ticket/${showQR.guest.qrToken}`;
                      window.open(`https://wa.me/${showQR.guest.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${showQR.guest.name}! Here's your digital ticket for ${event?.title}: ${ticketUrl}`)}`, "_blank");
                    } else {
                      toast.error("No phone number on file");
                    }
                  }}
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Notify Guests Modal */}
      <Modal isOpen={showNotify} onClose={() => setShowNotify(false)} title="Notify Guests" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-slate-400">Send an email reminder to your guests. Only guests with an email address on file will receive it.</p>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Send to</label>
            <select
              aria-label="Guest filter"
              value={notifyFilter}
              onChange={e => setNotifyFilter(e.target.value)}
              className="w-full bg-card border border-border text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50"
            >
              <option value="CONFIRMED">Confirmed guests only</option>
              <option value="PENDING">Pending guests only</option>
              <option value="ALL">All guests</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Custom message <span className="text-slate-600">(optional)</span></label>
            <textarea
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              placeholder="Add a personal message, any updates, or reminders for your guests..."
              rows={4}
              className="w-full bg-slate-900 border border-border text-slate-200 placeholder:text-slate-600 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setShowNotify(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleNotify} loading={notifying} icon={<Mail size={14} />} className="flex-1">Send Reminder</Button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={showImport} onClose={() => { setShowImport(false); setCsvText(""); setCsvPreview([]); }} title="Import Guests from CSV" size="md">
        <div className="p-6 flex flex-col gap-5">
          <div className="bg-slate-800/60 border border-border rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-300 mb-1">CSV format (one guest per line):</p>
            <code className="text-indigo-400">Name, Email, Phone</code>
            <br />
            <code className="text-slate-500">Jane Smith, jane@example.com, +1234567890</code>
            <br />
            <code className="text-slate-500">John Doe, john@example.com</code>
            <p className="mt-2 text-slate-600">Email and phone are optional. Header row is auto-detected.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Paste CSV data</label>
            <textarea
              value={csvText}
              onChange={e => handleCSVChange(e.target.value)}
              placeholder={"Name, Email, Phone\nJane Smith, jane@example.com, +1234567890\nJohn Doe, john@example.com"}
              rows={6}
              className="w-full bg-slate-900 border border-border text-slate-200 placeholder:text-slate-700 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-indigo-500/50 resize-none"
            />
            {csvPreview.length > 0 && (
              <p className="text-xs text-emerald-400 mt-1.5">{csvPreview.length} guest{csvPreview.length !== 1 ? "s" : ""} detected</p>
            )}
          </div>

          {csvPreview.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="text-left text-slate-400 px-3 py-2 font-medium">Name</th>
                    <th className="text-left text-slate-400 px-3 py-2 font-medium">Email</th>
                    <th className="text-left text-slate-400 px-3 py-2 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {csvPreview.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-white">{row.name}</td>
                      <td className="px-3 py-2 text-slate-400">{row.email || "—"}</td>
                      <td className="px-3 py-2 text-slate-400">{row.phone || "—"}</td>
                    </tr>
                  ))}
                  {csvPreview.length > 20 && (
                    <tr><td colSpan={3} className="px-3 py-2 text-slate-600 text-center">+ {csvPreview.length - 20} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
            <input type="checkbox" checked={sendInvites} onChange={e => setSendInvites(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
            <div>
              <p className="text-sm text-indigo-300 font-medium flex items-center gap-1.5"><Mail size={13} /> Send invite emails</p>
              <p className="text-xs text-slate-500 mt-0.5">Guests with email addresses will receive an invitation</p>
            </div>
          </label>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setShowImport(false); setCsvText(""); setCsvPreview([]); }} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={csvPreview.length === 0}
              icon={<Upload size={14} />}
              className="flex-1"
            >
              Import {csvPreview.length > 0 ? `${csvPreview.length} Guest${csvPreview.length !== 1 ? "s" : ""}` : ""}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Team Collaboration Modal */}
      <Modal isOpen={showTeam} onClose={() => setShowTeam(false)} title="Team Members" size="md">
        <div className="p-6 flex flex-col gap-5">
          <p className="text-sm text-slate-400">Invite team members to collaborate on this event. They can view, manage check-ins, or co-host depending on their role.</p>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="team@example.com"
                type="email"
                value={teamEmail}
                onChange={e => setTeamEmail(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleAddMember()}
                icon={<Mail size={15} />}
              />
            </div>
            <select
              aria-label="Team member role"
              value={teamRole}
              onChange={e => setTeamRole(e.target.value)}
              className="bg-card border border-border text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
            >
              <option value="VIEWER">Viewer</option>
              <option value="CHECKIN">Check-In</option>
              <option value="MANAGER">Manager</option>
              <option value="CO_HOST">Co-Host</option>
            </select>
            <Button onClick={handleAddMember} loading={addingMember} icon={<UserPlus size={14} />}>
              Add
            </Button>
          </div>

          <div className="bg-slate-800/40 border border-border rounded-xl p-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
            <div><span className="text-slate-400 font-medium">Viewer</span> — read-only access</div>
            <div><span className="text-slate-400 font-medium">Check-In</span> — scan QR codes</div>
            <div><span className="text-slate-400 font-medium">Manager</span> — manage guests</div>
            <div><span className="text-slate-400 font-medium">Co-Host</span> — full access</div>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No team members yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{member.user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.user.email}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    member.role === "CO_HOST" ? "bg-amber-500/15 text-amber-400" :
                    member.role === "MANAGER" ? "bg-indigo-500/15 text-indigo-400" :
                    member.role === "CHECKIN" ? "bg-emerald-500/15 text-emerald-400" :
                    "bg-slate-500/20 text-slate-400"
                  }`}>
                    {member.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Remove member"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
