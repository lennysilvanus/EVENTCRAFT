"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  Sparkles,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Clock,
  Tag,
  Hash,
  Globe,
  Lock,
  Ticket,
  RefreshCw,
  LayoutTemplate,
} from "lucide-react";
import TierEditor, { type TierDraft } from "@/components/ui/TierEditor";
import ImageUpload from "@/components/ui/ImageUpload";
import MediaGalleryUpload from "@/components/ui/MediaGalleryUpload";
import VideoUpload from "@/components/ui/VideoUpload";
import { Image as ImageIcon2 } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { EVENT_CATEGORIES } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Details", icon: <FileText size={16} /> },
  { id: 2, label: "Invite", icon: <Sparkles size={16} /> },
  { id: 3, label: "Settings", icon: <Users size={16} /> },
];

const TONE_OPTIONS = [
  { value: "elegant", label: "Elegant & Sophisticated" },
  { value: "formal", label: "Formal & Professional" },
  { value: "casual", label: "Warm & Casual" },
  { value: "fun", label: "Fun & Playful" },
];

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [givingAiConsent, setGivingAiConsent] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    endDate: "",
    endTime: "",
    location: "",
    address: "",
    category: "OTHER",
    maxGuests: "",
    dressCode: "",
    notes: "",
    inviteText: "",
    isPublic: false,
    isTemplate: false,
    recurrenceType: "NONE",
    recurrenceEnd: "",
    tone: "elegant",
    isPaid: false,
    ticketCurrency: "TZS",
    coverImage: "",
    posterImage: "",
    videoUrl: "",
  });

  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const [galleryImages, setGalleryImages] = useState<{ url: string }[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Event title is required";
    if (!form.description.trim() || form.description.length < 10) e.description = "Please add a description (min 10 chars)";
    if (!form.date) e.date = "Event date is required";
    if (!form.time) e.time = "Event time is required";
    if (!form.location.trim()) e.location = "Location is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doGenerateInvite = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTitle: form.title,
          eventDate: new Date(form.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
          eventTime: form.time,
          location: form.location,
          description: form.description,
          category: form.category,
          dressCode: form.dressCode,
          tone: form.tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "AI_CONSENT_REQUIRED") { setShowAiConsent(true); return; }
        throw new Error(data.error);
      }
      set("inviteText", data.data.inviteText);
      toast.success("Invite text generated!");
    } catch {
      toast.error("Failed to generate invite. Check your API key.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!form.title || !form.date || !form.location || !form.description) {
      toast.error("Please complete the event details first");
      return;
    }
    await doGenerateInvite();
  };

  const handleGiveAiConsent = async () => {
    setGivingAiConsent(true);
    try {
      const res = await fetch("/api/auth/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "AI_PROCESSING" }),
      });
      if (!res.ok) throw new Error("Failed to record consent");
      setShowAiConsent(false);
      await doGenerateInvite();
    } catch {
      toast.error("Could not record consent. Please try again.");
    } finally {
      setGivingAiConsent(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(s => Math.min(s + 1, 3));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const dateTime = form.date && form.time ? new Date(`${form.date}T${form.time}`).toISOString() : null;
      const endDateTime = form.endDate && form.endTime ? new Date(`${form.endDate}T${form.endTime}`).toISOString() : null;

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          date: dateTime,
          endDate: endDateTime,
          location: form.location,
          address: form.address,
          category: form.category,
          maxGuests: form.maxGuests ? parseInt(form.maxGuests) : undefined,
          dressCode: form.dressCode,
          notes: form.notes,
          inviteText: form.inviteText,
          isPublic: form.isPublic,
          isTemplate: form.isTemplate,
          recurrenceType: form.recurrenceType,
          recurrenceEnd: form.recurrenceType !== "NONE" && form.recurrenceEnd ? new Date(`${form.recurrenceEnd}T23:59`).toISOString() : undefined,
          coverImage: form.coverImage || null,
          posterImage: form.posterImage || null,
          videoUrl: form.videoUrl || null,
          ticketCurrency: form.isPaid ? form.ticketCurrency : undefined,
          tiers: form.isPaid && tiers.length > 0
            ? tiers.filter(t => t.name && t.price).map((t, i) => ({
                name: t.name,
                description: t.description || undefined,
                price: parseFloat(t.price),
                capacity: t.capacity ? parseInt(t.capacity) : undefined,
                sortOrder: i,
              }))
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Upload gallery images to the newly created event
      for (const img of galleryImages) {
        await fetch(`/api/events/${data.data.id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: img.url }),
        }).catch(() => {});
      }
      toast.success("Event created!");
      router.push(`/events/${data.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Create New Event</h1>
          <p className="text-slate-400 text-sm">AI will craft a beautiful invite based on your details</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => step > s.id && setStep(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${
                  step === s.id
                    ? "bg-indigo-600/20 border border-indigo-500/40 text-indigo-300"
                    : step > s.id
                    ? "bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 cursor-pointer"
                    : "bg-card border border-border text-slate-500"
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={16} className="text-slate-600 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Event Details */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cover Image</label>
              <ImageUpload value={form.coverImage} onChange={url => set("coverImage", url)} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <ImageIcon2 size={14} className="text-purple-400" /> Event Poster
                <span className="text-xs text-slate-500 font-normal">(downloadable by guests)</span>
              </label>
              <ImageUpload value={form.posterImage} onChange={url => set("posterImage", url)} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                Promo Video
                <span className="text-xs text-slate-500 font-normal">(upload file or paste YouTube/Vimeo link)</span>
              </label>
              <VideoUpload value={form.videoUrl} onChange={url => set("videoUrl", url)} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <ImageIcon2 size={14} className="text-indigo-400" /> Photo Gallery
                <span className="text-xs text-slate-500 font-normal">(up to 20 images)</span>
              </label>
              <MediaGalleryUpload images={galleryImages} onChange={setGalleryImages} />
            </div>
            <Input
              label="Event Title *"
              placeholder="e.g., Sarah & James Wedding Reception"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              icon={<Tag size={16} />}
              error={errors.title}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date *"
                type="date"
                value={form.date}
                onChange={e => set("date", e.target.value)}
                icon={<Calendar size={16} />}
                error={errors.date}
              />
              <Input
                label="Time *"
                type="time"
                value={form.time}
                onChange={e => set("time", e.target.value)}
                icon={<Clock size={16} />}
                error={errors.time}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={e => set("endDate", e.target.value)}
                icon={<Calendar size={16} />}
              />
              <Input
                label="End Time"
                type="time"
                value={form.endTime}
                onChange={e => set("endTime", e.target.value)}
                icon={<Clock size={16} />}
              />
            </div>
            <Input
              label="Venue / Location *"
              placeholder="e.g., The Grand Ballroom, New York"
              value={form.location}
              onChange={e => set("location", e.target.value)}
              icon={<MapPin size={16} />}
              error={errors.location}
            />
            <Input
              label="Full Address"
              placeholder="e.g., 123 Main St, New York, NY 10001"
              value={form.address}
              onChange={e => set("address", e.target.value)}
              icon={<MapPin size={16} />}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={e => set("category", e.target.value)}
              options={EVENT_CATEGORIES}
            />
            <Textarea
              label="Event Description *"
              placeholder="Describe your event — what's happening, the atmosphere, what guests can expect..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={4}
              error={errors.description}
            />
            <Input
              label="Dress Code"
              placeholder="e.g., Black tie, Smart casual, Festive attire"
              value={form.dressCode}
              onChange={e => set("dressCode", e.target.value)}
              icon={<Tag size={16} />}
            />

            <div className="flex justify-end mt-2">
              <Button onClick={handleNext} iconRight={<ChevronRight size={16} />}>
                Next: Invite Text
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: AI Invite Generation */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
              <Wand2 size={20} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-300 mb-1">AI Invite Generator</p>
                <p className="text-xs text-slate-400">Choose a tone and let Claude write a compelling invitation text for your event.</p>
              </div>
            </div>

            <Select
              label="Invitation Tone"
              value={form.tone}
              onChange={e => set("tone", e.target.value)}
              options={TONE_OPTIONS}
            />

            <Button
              onClick={handleGenerateInvite}
              loading={generating}
              variant="secondary"
              icon={<Sparkles size={16} />}
              className="self-start"
            >
              {generating ? "Generating..." : "Generate with AI"}
            </Button>

            <Textarea
              label="Invitation Text"
              placeholder="Click 'Generate with AI' above, or write your own invitation text here..."
              value={form.inviteText}
              onChange={e => set("inviteText", e.target.value)}
              rows={10}
              hint="This text will be shown to guests on the invite page"
            />

            <div className="flex items-center justify-between mt-2">
              <Button variant="ghost" onClick={() => setStep(1)} icon={<ChevronLeft size={16} />}>
                Back
              </Button>
              <Button onClick={handleNext} iconRight={<ChevronRight size={16} />}>
                Next: Settings
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
            <Input
              label="Maximum Guests"
              type="number"
              placeholder="Leave empty for unlimited"
              value={form.maxGuests}
              onChange={e => set("maxGuests", e.target.value)}
              icon={<Hash size={16} />}
              hint="RSVPs will close when this limit is reached"
            />
            <Textarea
              label="Internal Notes"
              placeholder="Notes for yourself — vendor contacts, reminders, etc. Guests won't see this."
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={3}
            />

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
                  <p className="text-sm font-medium text-white">
                    {form.isPublic ? "Public Event" : "Private Event"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {form.isPublic ? "Discoverable on /explore" : "Only invited guests can RSVP"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={form.isPublic ? "Switch to private event" : "Switch to public event"}
                onClick={() => set("isPublic", !form.isPublic)}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.isPublic ? "bg-emerald-600" : "bg-slate-700"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isPublic ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Recurrence */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${form.recurrenceType !== "NONE" ? "bg-indigo-600/15 text-indigo-400" : "bg-slate-700/60 text-slate-400"}`}>
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Recurring Event</p>
                    <p className="text-xs text-slate-500">Repeat this event on a schedule</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={form.recurrenceType !== "NONE" ? "Disable recurrence" : "Enable recurrence"}
                  onClick={() => set("recurrenceType", form.recurrenceType === "NONE" ? "WEEKLY" : "NONE")}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.recurrenceType !== "NONE" ? "bg-indigo-600" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.recurrenceType !== "NONE" ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>
              {form.recurrenceType !== "NONE" && (
                <div className="p-4 border-t border-border bg-indigo-500/5 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Repeat every</label>
                    <div className="flex gap-2">
                      {(["WEEKLY", "MONTHLY", "YEARLY"] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => set("recurrenceType", r)}
                          className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                            form.recurrenceType === r
                              ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                              : "border-border text-slate-400 hover:border-slate-500 hover:text-white"
                          }`}
                        >
                          {r === "WEEKLY" ? "Week" : r === "MONTHLY" ? "Month" : "Year"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    label="Repeat until (optional)"
                    type="date"
                    value={form.recurrenceEnd}
                    onChange={e => set("recurrenceEnd", e.target.value)}
                    icon={<Calendar size={16} />}
                    hint="Leave empty to repeat indefinitely"
                  />
                </div>
              )}
            </div>

            {/* Save as Template */}
            <div className="flex items-center justify-between p-4 bg-slate-800/40 border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${form.isTemplate ? "bg-purple-600/15 text-purple-400" : "bg-slate-700/60 text-slate-400"}`}>
                  <LayoutTemplate size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Save as Template</p>
                  <p className="text-xs text-slate-500">Reuse this event structure for future events</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={form.isTemplate ? "Unmark as template" : "Save as template"}
                onClick={() => set("isTemplate", !form.isTemplate)}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.isTemplate ? "bg-purple-600" : "bg-slate-700"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isTemplate ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-800/30 border border-border rounded-xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Event Summary</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Event</span>
                  <span className="text-white font-medium">{form.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time</span>
                  <span className="text-white">{form.date} {form.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="text-white">{form.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invite Text</span>
                  <span className={form.inviteText ? "text-emerald-400" : "text-amber-400"}>
                    {form.inviteText ? "Ready" : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticketing</span>
                  <span className={form.isPaid ? "text-amber-400 font-medium" : "text-slate-400"}>
                    {form.isPaid
                      ? tiers.length > 0
                        ? `${tiers.length} tier${tiers.length !== 1 ? "s" : ""} · ${form.ticketCurrency}`
                        : `Paid · ${form.ticketCurrency}`
                      : "Free"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <Button variant="ghost" onClick={() => setStep(2)} icon={<ChevronLeft size={16} />}>
                Back
              </Button>
              <Button onClick={handleSubmit} loading={saving} icon={<Sparkles size={16} />} size="lg">
                {saving ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* AI Processing consent modal */}
      {showAiConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/20">
                <Wand2 size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Invite Generation</h3>
                <p className="text-xs text-slate-400">One-time consent required</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-2">
              To generate invite text, EventCraft sends your event details (title, date, location, description) to <strong className="text-white">Anthropic&apos;s Claude API</strong>, a third-party AI processor.
            </p>
            <p className="text-xs text-slate-500 mb-5">
              No guest data is sent. You can withdraw this consent at any time via{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Privacy Policy</a>.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAiConsent(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={givingAiConsent}
                icon={<Wand2 size={15} />}
                onClick={handleGiveAiConsent}
              >
                I agree — Generate
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
