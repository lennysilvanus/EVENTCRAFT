"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Calendar, MapPin, Clock, Tag, Users, Hash, Globe, Lock, Ticket } from "lucide-react";
import TierEditor, { type TierDraft } from "@/components/ui/TierEditor";
import ImageUpload from "@/components/ui/ImageUpload";
import Link from "next/link";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { EVENT_CATEGORIES } from "@/lib/utils";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "", endDate: "", endTime: "",
    location: "", address: "", category: "OTHER", maxGuests: "",
    dressCode: "", notes: "", inviteText: "", isPublic: false, status: "DRAFT",
    isPaid: false, ticketCurrency: "TZS", coverImage: "",
  });
  const [tiers, setTiers] = useState<TierDraft[]>([]);

  useEffect(() => {
    fetch(`/api/events/${id}`).then(r => r.json()).then(d => {
      if (!d.data) { toast.error("Event not found"); return; }
      const e = d.data;
      const dt = new Date(e.date);
      const edt = e.endDate ? new Date(e.endDate) : null;
      setForm({
        title: e.title || "", description: e.description || "",
        date: dt.toISOString().slice(0, 10), time: dt.toTimeString().slice(0, 5),
        endDate: edt ? edt.toISOString().slice(0, 10) : "",
        endTime: edt ? edt.toTimeString().slice(0, 5) : "",
        location: e.location || "", address: e.address || "",
        category: e.category || "OTHER", maxGuests: e.maxGuests ? String(e.maxGuests) : "",
        dressCode: e.dressCode || "", notes: e.notes || "",
        inviteText: e.inviteText || "", isPublic: e.isPublic || false, status: e.status || "DRAFT",
        isPaid: !!(e.tiers?.length > 0),
        ticketCurrency: e.ticketCurrency || "TZS",
        coverImage: e.coverImage || "",
      });
      if (e.tiers?.length) {
        setTiers(e.tiers.map((t: { id: string; name: string; description: string | null; price: number; capacity: number | null; sortOrder: number }) => ({
          id: t.id,
          name: t.name,
          description: t.description || "",
          price: String(t.price),
          capacity: t.capacity != null ? String(t.capacity) : "",
          sortOrder: t.sortOrder,
        })));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const dateTime = form.date && form.time ? new Date(`${form.date}T${form.time}`).toISOString() : undefined;
      const endDateTime = form.endDate && form.endTime ? new Date(`${form.endDate}T${form.endTime}`).toISOString() : null;

      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, description: form.description, date: dateTime,
          endDate: endDateTime, location: form.location, address: form.address,
          category: form.category, maxGuests: form.maxGuests ? parseInt(form.maxGuests) : null,
          dressCode: form.dressCode, notes: form.notes, inviteText: form.inviteText,
          isPublic: form.isPublic, status: form.status,
          coverImage: form.coverImage || null,
          ticketCurrency: form.isPaid ? form.ticketCurrency : undefined,
          tiers: form.isPaid && tiers.length > 0
            ? tiers.filter(t => t.name && t.price).map((t, i) => ({
                name: t.name,
                description: t.description || undefined,
                price: parseFloat(t.price),
                capacity: t.capacity ? parseInt(t.capacity) : null,
                sortOrder: i,
              }))
            : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Event updated!");
      router.push(`/events/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
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

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/events/${id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft size={15} /> Back to Event
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Event</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Cover Image</label>
            <ImageUpload value={form.coverImage} onChange={url => set("coverImage", url)} />
          </div>
          <Input label="Event Title" value={form.title} onChange={e => set("title", e.target.value)} icon={<Tag size={16} />} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={e => set("date", e.target.value)} icon={<Calendar size={16} />} />
            <Input label="Time" type="time" value={form.time} onChange={e => set("time", e.target.value)} icon={<Clock size={16} />} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="End Date" type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} icon={<Calendar size={16} />} />
            <Input label="End Time" type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} icon={<Clock size={16} />} />
          </div>
          <Input label="Venue / Location" value={form.location} onChange={e => set("location", e.target.value)} icon={<MapPin size={16} />} />
          <Input label="Full Address" value={form.address} onChange={e => set("address", e.target.value)} icon={<MapPin size={16} />} />
          <Select label="Category" value={form.category} onChange={e => set("category", e.target.value)} options={EVENT_CATEGORIES} />
          <Select label="Status" value={form.status} onChange={e => set("status", e.target.value)} options={[
            { value: "DRAFT", label: "Draft" },
            { value: "PUBLISHED", label: "Published" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "COMPLETED", label: "Completed" },
          ]} />
          <Textarea label="Description" value={form.description} onChange={e => set("description", e.target.value)} rows={4} />
          <Textarea label="Invitation Text" value={form.inviteText} onChange={e => set("inviteText", e.target.value)} rows={6} />
          <Input label="Dress Code" value={form.dressCode} onChange={e => set("dressCode", e.target.value)} icon={<Tag size={16} />} />
          <Input label="Max Guests" type="number" value={form.maxGuests} onChange={e => set("maxGuests", e.target.value)} icon={<Hash size={16} />} />
          <Textarea label="Internal Notes" value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />

          {/* Ticketing */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${form.isPaid ? "bg-amber-500/15 text-amber-400" : "bg-slate-700/60 text-slate-400"}`}>
                  <Ticket size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{form.isPaid ? "Paid Event" : "Free Event"}</p>
                  <p className="text-xs text-slate-500">{form.isPaid ? "Guests select a ticket tier and pay via mobile money" : "No ticket required to RSVP"}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={form.isPaid ? "Switch to free event" : "Switch to paid event"}
                onClick={() => { set("isPaid", !form.isPaid); if (form.isPaid) setTiers([]); }}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.isPaid ? "bg-amber-500" : "bg-slate-700"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isPaid ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
            {form.isPaid && (
              <div className="p-4 border-t border-border bg-amber-500/5 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                  <select
                    aria-label="Ticket currency"
                    value={form.ticketCurrency}
                    onChange={e => set("ticketCurrency", e.target.value)}
                    className="w-52 bg-card border border-border text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="TZS">TZS — Tanzanian Shilling (TSh)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="UGX">UGX — Ugandan Shilling</option>
                    <option value="ZAR">ZAR — South African Rand</option>
                  </select>
                </div>
                <TierEditor
                  tiers={tiers}
                  currency={form.ticketCurrency}
                  category={form.category}
                  onChange={setTiers}
                />
                <p className="text-xs text-amber-400/70">
                  Guests will choose their tier and pay via mobile money (Snippe). Requires SNIPPE_API_KEY in .env.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/40 border border-border rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${form.isPublic ? "bg-emerald-600/15 text-emerald-400" : "bg-slate-700/60 text-slate-400"}`}>
                {form.isPublic ? <Globe size={18} /> : <Lock size={18} />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{form.isPublic ? "Public Event" : "Private Event"}</p>
                <p className="text-xs text-slate-500">{form.isPublic ? "Anyone with the link can RSVP" : "Only invited guests can RSVP"}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label={form.isPublic ? "Make event private" : "Make event public"}
              onClick={() => set("isPublic", !form.isPublic)}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.isPublic ? "bg-emerald-600" : "bg-slate-700"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isPublic ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href={`/events/${id}`} className="flex-1">
              <Button variant="outline" className="w-full">Cancel</Button>
            </Link>
            <Button onClick={handleSave} loading={saving} icon={<Save size={16} />} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
