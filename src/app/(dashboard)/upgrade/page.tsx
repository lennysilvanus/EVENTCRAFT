"use client";

import { useState, useEffect } from "react";
import { Check, Zap, Building2, Sparkles, Star, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { NETWORKS } from "@/lib/snippe-constants";
import { PLAN_PRICES } from "@/lib/plan-limits";

interface UserProfile { plan: string; name: string; email: string }

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: null,
    icon: <Sparkles size={20} className="text-slate-400" />,
    color: "border-border",
    badge: null,
    features: [
      "3 events total",
      "50 guests per event",
      "QR check-in",
      "WhatsApp sharing",
      "Digital tickets",
      "Add to calendar",
    ],
  },
  {
    key: "PRO",
    name: "Pro",
    price: PLAN_PRICES.PRO.tzs,
    icon: <Zap size={20} className="text-indigo-400" />,
    color: "border-indigo-500/40",
    badge: "Most Popular",
    features: [
      "Unlimited events",
      "500 guests per event",
      "AI invitation writing",
      "Analytics & reports",
      "Team collaboration (5 members)",
      "Bulk guest notifications",
      "Custom invite links",
      "Priority support",
    ],
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: PLAN_PRICES.BUSINESS.tzs,
    icon: <Building2 size={20} className="text-amber-400" />,
    color: "border-amber-500/30",
    badge: "For Teams",
    features: [
      "Everything in Pro",
      "Unlimited guests",
      "20 team members",
      "Paid ticketing (mobile money)",
      "Guest CRM & history",
      "Seating chart builder",
      "Dedicated support",
      "Reduced 2% platform fee",
    ],
  },
];

interface PaymentModal {
  plan: string;
  price: number;
}

export default function UpgradePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [modal, setModal] = useState<PaymentModal | null>(null);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("mpesa");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.data) setUser(d.data);
    });
  }, []);

  const handlePay = async () => {
    if (!modal) return;
    if (!phone.trim()) { toast.error("Enter your phone number"); return; }
    setPaying(true);
    try {
      const res = await fetch("/api/billing/snippe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: modal.plan, phone, network }),
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

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-4">
            <Star size={13} className="text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300">Simple, transparent pricing</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3">Upgrade EventCraft</h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Pay via mobile money. Plan activates instantly after payment.
          </p>
          {user && (
            <p className="text-sm text-slate-500 mt-2">
              Currently on <span className="text-white font-semibold">{user.plan}</span> plan
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = user?.plan === plan.key;
            return (
              <div
                key={plan.key}
                className={`relative bg-card border-2 rounded-2xl p-6 flex flex-col ${
                  plan.key === "PRO" ? plan.color + " shadow-lg shadow-indigo-900/20" : plan.color
                } ${isCurrent ? "opacity-70" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      plan.key === "PRO" ? "bg-indigo-600 text-white" : "bg-amber-500 text-black"
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-border flex items-center justify-center">
                    {plan.icon}
                  </div>
                  <div>
                    <p className="text-white font-bold">{plan.name}</p>
                    <p className="text-slate-400 text-sm">
                      {plan.price == null ? "Free forever" : `TZS ${plan.price.toLocaleString()}/month`}
                    </p>
                  </div>
                </div>

                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.key === "PRO" ? "primary" : plan.key === "BUSINESS" ? "secondary" : "outline"}
                  className="w-full"
                  disabled={isCurrent || plan.price == null}
                  icon={plan.price != null ? <Smartphone size={15} /> : undefined}
                  onClick={() => plan.price != null && !isCurrent && setModal({ plan: plan.key, price: plan.price })}
                >
                  {isCurrent ? "Current Plan" : plan.price == null ? "Free Plan" : `Pay with Mobile Money`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid sm:grid-cols-3 gap-4 text-center">
          {[
            { title: "Cancel anytime", desc: "No long-term contracts. Stop renewing at any time." },
            { title: "Mobile money", desc: "Pay via M-Pesa, Airtel, Tigo, Halotel or Mixx." },
            { title: "Instant activation", desc: "Your plan upgrades immediately after payment." },
          ].map(({ title, desc }) => (
            <div key={title} className="p-4 bg-card border border-border rounded-xl">
              <p className="text-sm font-semibold text-white mb-1">{title}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {paid ? (
              <div className="text-center py-4">
                <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Payment sent!</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Approve the USSD prompt on your phone. Your plan will activate within a minute.
                </p>
                <Button className="w-full" onClick={() => { setModal(null); setPaid(false); window.location.reload(); }}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-1">Upgrade to {modal.plan}</h3>
                <p className="text-slate-400 text-sm mb-5">
                  TZS {modal.price.toLocaleString()}/month — pay via mobile money
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
                    <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
                    <Button
                      className="flex-1"
                      loading={paying}
                      icon={paying ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
                      onClick={handlePay}
                    >
                      {paying ? "Sending..." : `Pay TZS ${modal.price.toLocaleString()}`}
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
