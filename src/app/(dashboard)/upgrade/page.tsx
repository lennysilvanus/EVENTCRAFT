"use client";

import { useState, useEffect } from "react";
import {
  Check, Zap, Building2, Sparkles, Star, Smartphone, Loader2,
  CheckCircle2, Shield, CalendarPlus, ToggleLeft, ToggleRight, XCircle, AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card3D } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { NETWORKS } from "@/lib/snippe-constants";
import { PLAN_PRICES_MONTHLY, PLAN_PRICES_ANNUAL, EVENT_CREDIT_PRICE_TZS, annualSaving } from "@/lib/plan-limits";

interface UserProfile { plan: string; planInterval: string; name: string; email: string; role: string; eventCredits: number }

type Interval = "MONTHLY" | "ANNUAL";
type PaymentType = "plan" | "event_credit";

interface PaymentModal {
  plan?: "PRO" | "BUSINESS";
  interval?: Interval;
  type: PaymentType;
  amount: number;
  label: string;
}

const PLAN_FEATURES: Record<"FREE" | "PRO" | "BUSINESS", string[]> = {
  FREE: [
    "3 events total",
    "50 guests per event",
    "QR code check-in",
    "WhatsApp sharing",
    "Digital tickets",
    "Add to calendar",
    "4% fee on paid tickets",
  ],
  PRO: [
    "Unlimited events",
    "500 guests per event",
    "3 AI invite generations/month",
    "Analytics & reports",
    "Team collaboration (5 members)",
    "Bulk guest notifications",
    "Custom invite links",
    "Priority support",
    "3% fee on paid tickets",
  ],
  BUSINESS: [
    "Everything in Pro",
    "Unlimited guests",
    "Unlimited AI invite generations",
    "20 team members",
    "Paid ticketing (mobile money)",
    "Guest CRM & history",
    "Seating chart builder",
    "White-label branding",
    "Dedicated support",
    "2% fee on paid tickets",
  ],
};

export default function UpgradePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const [modal, setModal] = useState<PaymentModal | null>(null);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("mpesa");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.data) {
        setUser(d.data);
        if (d.data.planInterval === "ANNUAL") setInterval("ANNUAL");
      }
    });
  }, []);

  const handlePay = async () => {
    if (!modal) return;
    if (!phone.trim()) { toast.error("Enter your phone number"); return; }
    setPaying(true);
    try {
      const body = modal.type === "event_credit"
        ? { type: "event_credit", phone, network }
        : { type: "plan", plan: modal.plan, interval: modal.interval, phone, network };

      const res = await fetch("/api/billing/snippe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaid(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const openPlanModal = (plan: "PRO" | "BUSINESS") => {
    const prices = interval === "ANNUAL" ? PLAN_PRICES_ANNUAL : PLAN_PRICES_MONTHLY;
    const planInfo = prices[plan];
    setModal({ type: "plan", plan, interval, amount: planInfo.tzs, label: `${planInfo.label} — ${interval === "ANNUAL" ? "1 year" : "1 month"}` });
  };

  const isCurrent = (plan: string) => user?.plan === plan && getEffectivePlanDisplay(user) === plan;

  function getEffectivePlanDisplay(u: UserProfile) {
    if (u.role === "ADMIN" || u.role === "SECURITY_ADMIN") return "BUSINESS";
    return u.plan;
  }

  const isAdmin = user?.role === "ADMIN" || user?.role === "SECURITY_ADMIN";

  const handleCancelPlan = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/auth/cancel-plan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Subscription cancelled. You're now on the free plan.");
      setShowCancelConfirm(false);
      setUser(u => u ? { ...u, plan: "FREE" } : u);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-4">
            <Star size={13} className="text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300">Simple, transparent pricing</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-3">Upgrade EventCraft</h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Pay via mobile money. Plan activates instantly after payment.
          </p>
          {user && (
            <p className="text-sm text-slate-500 mt-2">
              Currently on <span className="text-white font-semibold">{getEffectivePlanDisplay(user)}</span>
              {user.plan !== "FREE" && !isAdmin && (
                <span className="ml-1">· <span className="text-slate-400">{user.planInterval === "ANNUAL" ? "Annual" : "Monthly"}</span></span>
              )}
            </p>
          )}
        </div>

        {/* Admin banner */}
        {isAdmin && (
          <div className="mb-8 flex items-center gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Shield size={22} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tight">Admin — Full Access</p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Your admin role grants unlimited events, guests, and all Business-tier features. No subscription required.
              </p>
            </div>
          </div>
        )}

        {/* Monthly / Annual toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-semibold ${interval === "MONTHLY" ? "text-white" : "text-slate-500"}`}>Monthly</span>
          <button
            type="button"
            onClick={() => setInterval(i => i === "MONTHLY" ? "ANNUAL" : "MONTHLY")}
            aria-label={interval === "ANNUAL" ? "Switch to monthly billing" : "Switch to annual billing"}
            className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${interval === "ANNUAL" ? "bg-indigo-600" : "bg-slate-700"}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${interval === "ANNUAL" ? "translate-x-8" : "translate-x-1"}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${interval === "ANNUAL" ? "text-white" : "text-slate-500"}`}>Annual</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/25">
              Save up to 26%
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free */}
          <Card3D rounded="2xl" intensity="normal">
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-border flex items-center justify-center">
                  <Sparkles size={20} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Starter</p>
                  <p className="text-slate-400 text-sm">Free forever</p>
                </div>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-black text-white">Free</span>
              </div>
              <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                {PLAN_FEATURES.FREE.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check size={15} className="text-emerald-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" disabled>Current Free Plan</Button>
            </div>
          </Card3D>

          {/* Pro — highlighted */}
          <Card3D rounded="2xl" intensity="strong">
            <div className="relative bg-indigo-600 rounded-2xl p-6 flex flex-col ring-1 ring-indigo-400/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                  <Star size={10} fill="currentColor" /> Most Popular
                </span>
              </div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 border border-indigo-400/30 flex items-center justify-center">
                  <Zap size={20} className="text-indigo-100" />
                </div>
                <div>
                  <p className="text-white font-bold">Pro</p>
                  <p className="text-indigo-200 text-sm">{interval === "ANNUAL" ? "Billed annually" : "Billed monthly"}</p>
                </div>
              </div>
              <div className="mb-1">
                <span className="text-4xl font-black text-white">
                  {interval === "ANNUAL"
                    ? `TZS ${(PLAN_PRICES_ANNUAL.PRO.tzs).toLocaleString()}`
                    : `TZS ${PLAN_PRICES_MONTHLY.PRO.tzs.toLocaleString()}`}
                </span>
                <span className="text-indigo-200 text-sm ml-1">/{interval === "ANNUAL" ? "yr" : "mo"}</span>
              </div>
              {interval === "ANNUAL" && (
                <p className="text-indigo-300 text-xs mb-4">
                  Save TZS {annualSaving("PRO").toLocaleString()} vs monthly
                </p>
              )}
              <ul className="flex flex-col gap-2.5 mb-6 flex-1 mt-2">
                {PLAN_FEATURES.PRO.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                    <Check size={15} className="text-indigo-200 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button
                variant="primary"
                className="w-full bg-white hover:bg-indigo-50 !text-indigo-700 !shadow-[0_4px_0_0_#312e81]"
                disabled={isCurrent("PRO") || isAdmin}
                icon={<Smartphone size={15} />}
                onClick={() => openPlanModal("PRO")}
              >
                {isCurrent("PRO") ? "Current Plan" : "Pay with Mobile Money"}
              </Button>
            </div>
          </Card3D>

          {/* Business */}
          <Card3D rounded="2xl" intensity="normal">
            <div className="bg-card border-2 border-amber-500/30 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-border flex items-center justify-center">
                  <Building2 size={20} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Business</p>
                  <p className="text-slate-400 text-sm">{interval === "ANNUAL" ? "Billed annually" : "Billed monthly"}</p>
                </div>
              </div>
              <div className="mb-1">
                <span className="text-4xl font-black text-white">
                  {interval === "ANNUAL"
                    ? `TZS ${PLAN_PRICES_ANNUAL.BUSINESS.tzs.toLocaleString()}`
                    : `TZS ${PLAN_PRICES_MONTHLY.BUSINESS.tzs.toLocaleString()}`}
                </span>
                <span className="text-slate-400 text-sm ml-1">/{interval === "ANNUAL" ? "yr" : "mo"}</span>
              </div>
              {interval === "ANNUAL" && (
                <p className="text-amber-400 text-xs mb-4">
                  Save TZS {annualSaving("BUSINESS").toLocaleString()} vs monthly
                </p>
              )}
              <ul className="flex flex-col gap-2.5 mb-6 flex-1 mt-2">
                {PLAN_FEATURES.BUSINESS.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check size={15} className="text-emerald-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className="w-full"
                disabled={isCurrent("BUSINESS") || isAdmin}
                icon={<Smartphone size={15} />}
                onClick={() => openPlanModal("BUSINESS")}
              >
                {isCurrent("BUSINESS") ? "Current Plan" : "Pay with Mobile Money"}
              </Button>
            </div>
          </Card3D>
        </div>

        {/* Pay-per-event */}
        <div className="mb-10">
          <Card3D intensity="subtle">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                    <CalendarPlus size={22} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-base font-black text-white tracking-tight">Pay per event</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      For occasional hosts. Buy a single event credit — no subscription needed.
                    </p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-xl font-black text-purple-300">TZS {EVENT_CREDIT_PRICE_TZS.toLocaleString()}</span>
                      <span className="text-xs text-slate-500">per event · no expiry</span>
                      {user?.eventCredits !== undefined && user.eventCredits > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {user.eventCredits} credit{user.eventCredits !== 1 ? "s" : ""} available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="shrink-0 border-purple-500/40 text-purple-300 hover:border-purple-400 hover:text-purple-200"
                  icon={<Smartphone size={15} />}
                  onClick={() => setModal({ type: "event_credit", amount: EVENT_CREDIT_PRICE_TZS, label: "1 Event Credit" })}
                >
                  Buy a Credit
                </Button>
              </div>
            </div>
          </Card3D>
        </div>

        {/* Trust row */}
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          {[
            { title: "Cancel anytime", desc: "No long-term contracts. Stop renewing at any time." },
            { title: "Mobile money", desc: "Pay via M-Pesa, Airtel, Tigo, Halotel or Mixx." },
            { title: "Instant activation", desc: "Your plan upgrades immediately after payment." },
          ].map(({ title, desc }) => (
            <Card3D key={title} intensity="subtle">
              <div className="p-4 bg-card border border-border rounded-xl">
                <p className="text-sm font-semibold text-white mb-1">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </Card3D>
          ))}
        </div>

        {/* Cancel subscription */}
        {user && user.plan !== "FREE" && !isAdmin && (
          <div className="mt-12 border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-1">
              <AlertTriangle size={15} /> Cancel Subscription
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Cancel your <span className="text-white">{user.plan}</span> plan. Your access continues until the end of the current billing period, then switches to Free.
            </p>
            {!showCancelConfirm ? (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-4 py-2 rounded-lg transition-colors"
              >
                <XCircle size={14} /> Cancel my subscription
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                  Your subscription will be cancelled immediately and your plan will revert to Free. Payments already made are non-refundable.
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCancelPlan}
                    loading={cancelling}
                    className="bg-red-600 hover:bg-red-500 border-red-500"
                    icon={<XCircle size={14} />}
                  >
                    {cancelling ? "Cancelling…" : "Confirm cancellation"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>Keep my plan</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
            {paid ? (
              <div className="text-center py-4">
                <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-black text-white tracking-tight mb-2">
                  {modal.type === "event_credit" ? "Credit purchased!" : "Payment sent!"}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {modal.type === "event_credit"
                    ? "Approve the USSD prompt to complete. Your event credit will appear shortly."
                    : "Approve the USSD prompt on your phone. Your plan will activate within a minute."}
                </p>
                <Button className="w-full" onClick={() => { setModal(null); setPaid(false); window.location.reload(); }}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-white tracking-tight mb-1">{modal.label}</h3>
                <p className="text-slate-400 text-sm mb-5">
                  TZS {modal.amount.toLocaleString()} — pay via mobile money
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Mobile Network</label>
                    <div className="grid grid-cols-3 gap-2">
                      {NETWORKS.map(n => (
                        <button
                          key={n.value}
                          type="button"
                          onClick={() => setNetwork(n.value)}
                          className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                            network === n.value
                              ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                              : "border-border text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Phone Number *"
                    placeholder="0712345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    icon={<Smartphone size={15} />}
                  />

                  <p className="text-xs text-slate-500 -mt-2">
                    You'll receive a USSD prompt to approve the payment.
                  </p>

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => { setModal(null); setPaid(false); }}>Cancel</Button>
                    <Button
                      className="flex-1"
                      loading={paying}
                      icon={paying ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
                      onClick={handlePay}
                    >
                      {paying ? "Sending…" : `Pay TZS ${modal.amount.toLocaleString()}`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
