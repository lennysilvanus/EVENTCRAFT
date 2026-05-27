"use client";

import { useEffect, useState, use, useCallback } from "react";
import {
  Calendar, MapPin, Clock, Users, CheckCircle2, XCircle, Sparkles,
  MessageCircle, User, Mail, Phone, QrCode, Ticket, Smartphone, Loader2,
} from "lucide-react";
import AddToCalendar from "@/components/ui/AddToCalendar";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { formatDate, formatTime, getCategoryIcon } from "@/lib/utils";
import { NETWORKS } from "@/lib/snippe-constants";

interface EventTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  sortOrder: number;
  sold: number;
  remaining: number | null;
}

interface EventPublic {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  address?: string;
  inviteText?: string;
  category: string;
  coverImage?: string | null;
  dressCode?: string;
  maxGuests?: number;
  ticketPrice?: number | null;
  ticketCurrency?: string;
  tiers?: EventTier[];
  host: { name: string };
  _count: { guests: number };
}

type Step = "view" | "rsvp" | "payment" | "waiting" | "done";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("view");
  const [rsvpStatus, setRsvpStatus] = useState<"CONFIRMED" | "DECLINED" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [guestData, setGuestData] = useState({ name: "", email: "", phone: "", plusOne: false, dietaryReqs: "", message: "" });
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [payerPhone, setPayerPhone] = useState("");
  const [payerNetwork, setPayerNetwork] = useState("mpesa");
  const [pendingQrToken, setPendingQrToken] = useState<string | null>(null);
  const [guestQR, setGuestQR] = useState<string | null>(null);
  const [submittedGuest, setSubmittedGuest] = useState<{ name: string; status: string; qrToken?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setEvent(d.data); })
      .catch(() => setError("Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  // Poll for payment confirmation while in "waiting" step
  const pollPayment = useCallback((qrToken: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/checkin/${qrToken}`);
        const data = await res.json();
        if (data.data?.status === "CONFIRMED") {
          clearInterval(interval);
          setSubmittedGuest({ name: guestData.name, status: "CONFIRMED", qrToken });
          fetch(`/api/qr/public/${qrToken}`)
            .then(r => r.json())
            .then(qr => { if (qr.data?.qrCode) setGuestQR(qr.data.qrCode); })
            .catch(() => {});
          setStep("done");
        }
      } catch { /* silent */ }
      if (attempts >= 60) { // 5 minutes timeout
        clearInterval(interval);
        toast.error("Payment confirmation timed out. If you paid, your ticket will arrive via email.");
        setStep("view");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [guestData.name]);

  useEffect(() => {
    if (step === "waiting" && pendingQrToken) {
      return pollPayment(pendingQrToken);
    }
  }, [step, pendingQrToken, pollPayment]);

  const hasTiers = !!(event?.tiers && event.tiers.length > 0);
  const isPaidEvent = hasTiers || !!(event?.ticketPrice && event.ticketPrice > 0);
  const selectedTier = hasTiers ? event?.tiers?.find(t => t.id === selectedTierId) : null;
  const tierPrice = selectedTier?.price ?? 0;
  const isTierSoldOut = selectedTier?.remaining !== null && selectedTier?.remaining !== undefined && selectedTier.remaining <= 0;

  const handleRSVPSubmit = async () => {
    if (!guestData.name.trim()) { toast.error("Please enter your name"); return; }
    if (!rsvpStatus) { toast.error("Please select your attendance"); return; }
    if (rsvpStatus === "CONFIRMED" && hasTiers && !selectedTierId) { toast.error("Please select a ticket tier"); return; }
    if (rsvpStatus === "CONFIRMED" && isTierSoldOut) { toast.error("This ticket tier is sold out"); return; }

    const needsPayment = rsvpStatus === "CONFIRMED" && isPaidEvent && (hasTiers ? tierPrice > 0 : true);

    if (needsPayment) {
      if (!guestData.phone.trim()) { toast.error("Phone number is required for paid events"); return; }
      setStep("payment");
      return;
    }

    // Free RSVP
    setSubmitting(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event!.id,
          tierId: selectedTierId || undefined,
          name: guestData.name,
          email: guestData.email || undefined,
          phone: guestData.phone || undefined,
          status: rsvpStatus,
          plusOne: guestData.plusOne,
          dietaryReqs: guestData.dietaryReqs || undefined,
          message: guestData.message || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmittedGuest({ name: guestData.name, status: rsvpStatus, qrToken: data.data?.qrToken });
      setStep("done");
      if (rsvpStatus === "CONFIRMED" && data.data?.qrToken) {
        fetch(`/api/qr/public/${data.data.qrToken}`)
          .then(r => r.json())
          .then(qr => { if (qr.data?.qrCode) setGuestQR(qr.data.qrCode); })
          .catch(() => {});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!payerPhone.trim()) { toast.error("Enter the phone number to charge"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/snippe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event!.id,
          tierId: selectedTierId || undefined,
          guestName: guestData.name,
          guestEmail: guestData.email || undefined,
          guestPhone: guestData.phone,
          payerPhone,
          network: payerNetwork,
          plusOne: guestData.plusOne,
          dietaryReqs: guestData.dietaryReqs || undefined,
          message: guestData.message || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPendingQrToken(data.data.qrToken);
      setStep("waiting");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const currency = event?.ticketCurrency ?? "TZS";
  const payAmount = hasTiers ? tierPrice : (event?.ticketPrice ?? 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invitation not found</h1>
          <p className="text-slate-400 text-sm">{error || "This invitation link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-0 inset-x-0 h-64 bg-linear-to-b from-indigo-600/10 to-transparent pointer-events-none" />

      <div className="relative max-w-xl mx-auto px-4 py-12">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-base">EventCraft</span>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
          {/* Event hero */}
          {event.coverImage && (
            <div className="relative w-full h-48 overflow-hidden">
              <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-card" />
            </div>
          )}
          <div className={`relative bg-linear-to-br from-indigo-600/20 via-purple-600/10 to-transparent p-8 border-b border-border ${event.coverImage ? "pt-5" : ""}`}>
            <div className="text-center">
              {!event.coverImage && <div className="text-5xl mb-4">{getCategoryIcon(event.category)}</div>}
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
                {event.host.name} invites you to
              </p>
              <h1 className="text-2xl font-bold text-white mb-4">{event.title}</h1>
              <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm text-slate-400">
                <span className="flex items-center justify-center gap-2">
                  <Calendar size={14} className="text-indigo-400" />{formatDate(event.date)}
                </span>
                <span className="hidden sm:block text-slate-600">•</span>
                <span className="flex items-center justify-center gap-2">
                  <Clock size={14} className="text-indigo-400" />{formatTime(event.date)}
                </span>
                <span className="hidden sm:block text-slate-600">•</span>
                <span className="flex items-center justify-center gap-2">
                  <MapPin size={14} className="text-indigo-400" />{event.location}
                </span>
              </div>
            </div>
          </div>

          {/* STEP: VIEW */}
          {step === "view" && (
            <div className="p-6">
              {event.inviteText && (
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-6">{event.inviteText}</p>
              )}

              <div className="bg-slate-800/40 border border-border rounded-xl p-4 mb-6 flex flex-col gap-3 text-sm">
                {event.address && (
                  <div className="flex gap-3">
                    <MapPin size={15} className="text-slate-500 mt-0.5 shrink-0" />
                    <div><p className="text-slate-400">Address</p><p className="text-white">{event.address}</p></div>
                  </div>
                )}
                {event.endDate && (
                  <div className="flex gap-3">
                    <Clock size={15} className="text-slate-500 mt-0.5 shrink-0" />
                    <div><p className="text-slate-400">Until</p><p className="text-white">{formatTime(event.endDate)}</p></div>
                  </div>
                )}
                {event.dressCode && (
                  <div className="flex gap-3">
                    <Users size={15} className="text-slate-500 mt-0.5 shrink-0" />
                    <div><p className="text-slate-400">Dress Code</p><p className="text-white">{event.dressCode}</p></div>
                  </div>
                )}
              </div>

              {/* Tier picker */}
              {hasTiers && event.tiers && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Ticket size={12} /> Select Your Ticket
                  </p>
                  <div className="flex flex-col gap-2">
                    {event.tiers.map(tier => {
                      const soldOut = tier.remaining !== null && tier.remaining <= 0;
                      const isSelected = selectedTierId === tier.id;
                      const badgeClass = tier.name.toLowerCase().includes("vvip") || tier.name.toLowerCase().includes("platinum")
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : tier.name.toLowerCase().includes("vip") || tier.name.toLowerCase().includes("gold")
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                          : "bg-slate-500/20 text-slate-400 border-slate-500/30";
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          disabled={soldOut}
                          onClick={() => !soldOut && setSelectedTierId(tier.id)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            soldOut ? "opacity-40 cursor-not-allowed border-border bg-slate-800/20"
                            : isSelected ? "border-indigo-500 bg-indigo-600/10"
                            : "border-border hover:border-slate-500 bg-slate-800/20 hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? "border-indigo-400 bg-indigo-500" : "border-slate-600"}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-white">{tier.name}</span>
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${badgeClass}`}>
                                    {soldOut ? "Sold Out" : tier.remaining !== null ? `${tier.remaining} left` : "Available"}
                                  </span>
                                </div>
                                {tier.description && <p className="text-xs text-slate-400 mt-0.5">{tier.description}</p>}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-white shrink-0">
                              {currency} {tier.price.toLocaleString()}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Flat price badge */}
              {!hasTiers && isPaidEvent && event.ticketPrice && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-5">
                  <Ticket size={20} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Paid Event</p>
                    <p className="text-xs text-amber-400/70">
                      Ticket: <span className="font-bold text-amber-300">{currency} {event.ticketPrice.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => { setRsvpStatus("CONFIRMED"); setStep("rsvp"); }}
                  className="flex-1"
                  size="lg"
                  disabled={hasTiers && !selectedTierId}
                  icon={isPaidEvent && (tierPrice > 0 || (!hasTiers && event.ticketPrice)) ? <Smartphone size={18} /> : <CheckCircle2 size={18} />}
                >
                  {hasTiers && selectedTier
                    ? tierPrice > 0 ? `Buy ${selectedTier.name} — ${currency} ${tierPrice.toLocaleString()}` : `Confirm — ${selectedTier.name}`
                    : !hasTiers && isPaidEvent && event.ticketPrice ? `Buy Ticket — ${currency} ${event.ticketPrice.toLocaleString()}`
                    : hasTiers ? "Select a tier above" : "I'll be there!"}
                </Button>
                <Button
                  onClick={() => { setRsvpStatus("DECLINED"); setStep("rsvp"); }}
                  variant="outline" size="lg" icon={<XCircle size={18} />}
                >
                  Can&apos;t make it
                </Button>
              </div>
            </div>
          )}

          {/* STEP: RSVP DETAILS */}
          {step === "rsvp" && (
            <div className="p-6">
              <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${rsvpStatus === "CONFIRMED" ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-300" : "bg-red-600/10 border-red-500/20 text-red-300"}`}>
                {rsvpStatus === "CONFIRMED" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                <div>
                  <p className="text-sm font-semibold">{rsvpStatus === "CONFIRMED" ? "Attending!" : "Not attending"}</p>
                  <p className="text-xs opacity-70">{rsvpStatus === "CONFIRMED" ? "We can't wait to see you!" : "We'll miss you."}</p>
                </div>
                <button type="button" onClick={() => setStep("view")} className="ml-auto text-xs opacity-60 hover:opacity-100 underline">Change</button>
              </div>

              <div className="flex flex-col gap-4">
                <Input label="Your Name *" placeholder="Jane Smith" value={guestData.name} onChange={e => setGuestData(d => ({ ...d, name: e.target.value }))} icon={<User size={15} />} />
                <Input label="Email" type="email" placeholder="jane@example.com" value={guestData.email} onChange={e => setGuestData(d => ({ ...d, email: e.target.value }))} icon={<Mail size={15} />} />
                <Input label={isPaidEvent && rsvpStatus === "CONFIRMED" ? "Phone Number *" : "Phone (WhatsApp)"} placeholder="0712345678" value={guestData.phone} onChange={e => setGuestData(d => ({ ...d, phone: e.target.value }))} icon={<Phone size={15} />} />

                {rsvpStatus === "CONFIRMED" && (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer py-1">
                      <input type="checkbox" checked={guestData.plusOne} onChange={e => setGuestData(d => ({ ...d, plusOne: e.target.checked }))} className="w-4 h-4 rounded accent-indigo-500" />
                      <span className="text-sm text-slate-300">Bringing a +1 guest</span>
                    </label>
                    <Input label="Dietary Requirements" placeholder="e.g., Vegetarian, Gluten-free" value={guestData.dietaryReqs} onChange={e => setGuestData(d => ({ ...d, dietaryReqs: e.target.value }))} />
                  </>
                )}

                <Textarea label="Message to host (optional)" placeholder="Looking forward to it!" value={guestData.message} onChange={e => setGuestData(d => ({ ...d, message: e.target.value }))} rows={3} />

                {rsvpStatus === "CONFIRMED" && isPaidEvent && (hasTiers ? tierPrice > 0 : true) && selectedTier && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <Ticket size={13} className="mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">{selectedTier.name}</span>
                      {selectedTier.description && <span className="text-amber-400/70"> — {selectedTier.description}</span>}
                      <p className="mt-0.5 text-amber-400/70">You&apos;ll pay via mobile money on the next step.</p>
                    </div>
                  </div>
                )}

                <Button onClick={handleRSVPSubmit} loading={submitting} size="lg" className="w-full mt-2" variant={rsvpStatus === "CONFIRMED" ? "primary" : "danger"}>
                  {submitting ? "Submitting..."
                    : rsvpStatus === "CONFIRMED" && isPaidEvent && (hasTiers ? tierPrice > 0 : true)
                      ? "Continue to Payment →"
                      : rsvpStatus === "CONFIRMED" ? "Confirm Attendance" : "Submit RSVP"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP: MOBILE MONEY PAYMENT */}
          {step === "payment" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                  <Smartphone size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Mobile Money Payment</p>
                  <p className="text-xs text-slate-400">You&apos;ll receive a USSD prompt to approve</p>
                </div>
              </div>

              {/* Amount summary */}
              <div className="p-4 bg-slate-800/50 border border-border rounded-xl mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Ticket</span>
                  <span className="text-sm font-semibold text-white">
                    {selectedTier ? selectedTier.name : "General Ticket"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Amount</span>
                  <span className="text-lg font-bold text-white">{currency} {payAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-slate-500">Guest</span>
                  <span className="text-xs text-slate-400">{guestData.name}</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Network selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Mobile Network</label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {NETWORKS.map(n => (
                      <button
                        key={n.value}
                        type="button"
                        onClick={() => setPayerNetwork(n.value)}
                        className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center ${
                          payerNetwork === n.value
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                            : "border-border text-slate-400 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Phone Number to Charge *"
                  placeholder="0712345678"
                  value={payerPhone}
                  onChange={e => setPayerPhone(e.target.value)}
                  icon={<Phone size={15} />}
                />

                <p className="text-xs text-slate-500 -mt-2">
                  Enter the number that will receive the USSD prompt. This can be different from your contact number above.
                </p>

                <div className="flex gap-3 mt-2">
                  <Button variant="outline" onClick={() => setStep("rsvp")} className="flex-1">Back</Button>
                  <Button onClick={handlePayment} loading={submitting} icon={<Smartphone size={16} />} className="flex-1">
                    {submitting ? "Sending prompt..." : `Pay ${currency} ${payAmount.toLocaleString()}`}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP: WAITING FOR USSD APPROVAL */}
          {step === "waiting" && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                <Loader2 size={36} className="text-amber-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Waiting for your approval</h2>
              <p className="text-slate-400 text-sm mb-6">
                A USSD prompt has been sent to <span className="text-white font-medium">{payerPhone}</span>.
                Open it on your phone, enter your PIN, and confirm the payment of{" "}
                <span className="text-white font-semibold">{currency} {payAmount.toLocaleString()}</span>.
              </p>
              <div className="flex flex-col gap-3 items-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={12} className="animate-spin" />
                  Checking for confirmation every 5 seconds...
                </div>
                <button
                  type="button"
                  onClick={() => { setStep("payment"); setPendingQrToken(null); }}
                  className="text-xs text-slate-500 hover:text-white underline mt-2"
                >
                  Didn&apos;t receive the prompt? Try again
                </button>
              </div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === "done" && submittedGuest && (
            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 ${submittedGuest.status === "CONFIRMED" ? "bg-emerald-600/15 border border-emerald-500/30" : "bg-slate-700/40 border border-border"}`}>
                {submittedGuest.status === "CONFIRMED"
                  ? <CheckCircle2 size={36} className="text-emerald-400" />
                  : <XCircle size={36} className="text-slate-400" />}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {submittedGuest.status === "CONFIRMED" ? "You're on the list!" : "RSVP submitted"}
              </h2>
              <p className="text-slate-400 mb-6">
                {submittedGuest.status === "CONFIRMED"
                  ? `Thanks, ${submittedGuest.name}! We're excited to see you at ${event.title}.`
                  : `Thanks for letting us know, ${submittedGuest.name}. We'll miss you at ${event.title}.`}
              </p>

              {submittedGuest.status === "CONFIRMED" && (
                <>
                  <div className="bg-slate-800/40 border border-border rounded-xl p-4 text-sm text-left mb-4">
                    <p className="text-slate-400 mb-1 font-medium">Event details:</p>
                    <p className="text-white">{formatDate(event.date)} at {formatTime(event.date)}</p>
                    <p className="text-slate-400">{event.location}</p>
                  </div>

                  <div className="mb-5 flex justify-center">
                    <AddToCalendar
                      title={event.title}
                      start={new Date(event.date)}
                      end={event.endDate ? new Date(event.endDate) : undefined}
                      location={[event.location, event.address].filter(Boolean).join(", ") || undefined}
                      qrToken={submittedGuest.qrToken}
                      size="sm"
                    />
                  </div>

                  <div className="mb-6 flex flex-col items-center gap-3">
                    {submittedGuest.qrToken ? (
                      <>
                        {guestQR && (
                          <div className="bg-white p-2.5 rounded-xl shadow-lg">
                            <img src={guestQR} alt="Your check-in QR code" className="w-28 h-28" />
                          </div>
                        )}
                        <p className="text-xs text-slate-500">Your check-in QR code — show this at the door</p>
                        <div className="flex gap-2 flex-wrap justify-center">
                          <a href={`/ticket/${submittedGuest.qrToken}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" icon={<QrCode size={14} />}>View Full Ticket</Button>
                          </a>
                          {guestData.phone && (
                            <a
                              href={`https://wa.me/${guestData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi! Here's your ticket for ${event.title} on ${formatDate(event.date)}: ${window.location.origin}/ticket/${submittedGuest.qrToken}`)}`}
                              target="_blank" rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" icon={<MessageCircle size={14} />}>Send to myself</Button>
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </>
              )}

              <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`I just RSVP'd to ${event.title} on ${formatDate(event.date)}!`)}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" icon={<MessageCircle size={16} />} size="sm">Share on WhatsApp</Button>
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by <span className="text-indigo-500">EventCraft</span>
        </p>
      </div>
    </div>
  );
}
