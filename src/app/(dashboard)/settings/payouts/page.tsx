"use client";

import { useEffect, useState } from "react";
import { Smartphone, Building2, Plus, Trash2, Star, CheckCircle2, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { NETWORKS, BANKS } from "@/lib/snippe";

interface PayoutMethod {
  id: string;
  type: string;
  network?: string | null;
  phone?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  isDefault: boolean;
}

type Tab = "mobile_money" | "bank_transfer";

export default function PayoutSettingsPage() {
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("mobile_money");

  const [mobileForm, setMobileForm] = useState({ network: "mpesa", phone: "", accountName: "" });
  const [bankForm, setBankForm] = useState({ bankName: "", bankCode: "", accountNumber: "", accountName: "" });

  useEffect(() => {
    fetch("/api/payout-settings")
      .then(r => r.json())
      .then(d => { if (d.data) setMethods(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const body = tab === "mobile_money"
        ? { type: "mobile_money", ...mobileForm }
        : { type: "bank_transfer", ...bankForm };

      const res = await fetch("/api/payout-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMethods(prev => [data.data, ...prev.map(m => ({ ...m, isDefault: false }))]);
      setMobileForm({ network: "mpesa", phone: "", accountName: "" });
      setBankForm({ bankName: "", bankCode: "", accountNumber: "", accountName: "" });
      toast.success("Payout method added!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this payout method?")) return;
    try {
      await fetch("/api/payout-settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMethods(prev => prev.filter(m => m.id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch("/api/payout-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
      toast.success("Default updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const networkLabel = (val: string) => NETWORKS.find(n => n.value === val)?.label ?? val;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Payout Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Where EventCraft sends your ticket revenue after each payment.</p>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <AlertCircle size={16} className="text-indigo-400 mt-0.5 shrink-0" />
          <div className="text-sm text-indigo-300">
            <p className="font-medium mb-0.5">How payouts work</p>
            <p className="text-indigo-300/70">When a guest pays for a ticket, EventCraft keeps a 4% platform fee and automatically sends the remaining 96% to your default payout method — usually within minutes.</p>
          </div>
        </div>

        {/* Saved methods */}
        {!loading && methods.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-white">Your Payout Methods</p>
            </div>
            <div className="divide-y divide-border">
              {methods.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`p-2 rounded-lg ${m.type === "mobile_money" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`}>
                    {m.type === "mobile_money" ? <Smartphone size={16} /> : <Building2 size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {m.type === "mobile_money" ? (
                      <>
                        <p className="text-sm font-medium text-white">{networkLabel(m.network ?? "")} — {m.phone}</p>
                        {m.accountName && <p className="text-xs text-slate-500">{m.accountName}</p>}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-white">{m.bankName} — {m.accountNumber}</p>
                        <p className="text-xs text-slate-500">{m.accountName}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isDefault ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                        <CheckCircle2 size={11} /> Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(m.id)}
                        className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                      >
                        <Star size={11} /> Set default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label="Remove payout method"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new method */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-white">Add Payout Method</p>
          </div>

          {/* Tab selector */}
          <div className="flex gap-1 p-4 pb-0">
            {([["mobile_money", "Mobile Money", Smartphone], ["bank_transfer", "Bank Account", Building2]] as const).map(([val, label, Icon]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTab(val)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === val ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div className="p-4 flex flex-col gap-4">
            {tab === "mobile_money" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Network</label>
                  <select
                    aria-label="Mobile network"
                    value={mobileForm.network}
                    onChange={e => setMobileForm(f => ({ ...f, network: e.target.value }))}
                    className="w-full bg-surface border border-border text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50"
                  >
                    {NETWORKS.map(n => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Phone Number"
                  placeholder="e.g. 0712345678"
                  value={mobileForm.phone}
                  onChange={e => setMobileForm(f => ({ ...f, phone: e.target.value }))}
                />
                <Input
                  label="Account Name (optional)"
                  placeholder="Name registered to this number"
                  value={mobileForm.accountName}
                  onChange={e => setMobileForm(f => ({ ...f, accountName: e.target.value }))}
                />
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Bank</label>
                  <select
                    aria-label="Bank name"
                    value={bankForm.bankCode}
                    onChange={e => {
                      const bank = BANKS.find(b => b.code === e.target.value);
                      setBankForm(f => ({ ...f, bankCode: e.target.value, bankName: bank?.name ?? "" }));
                    }}
                    className="w-full bg-surface border border-border text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Select a bank</option>
                    {BANKS.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Account Number"
                  placeholder="e.g. 0123456789"
                  value={bankForm.accountNumber}
                  onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))}
                />
                <Input
                  label="Account Name"
                  placeholder="Full name as on bank account"
                  value={bankForm.accountName}
                  onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))}
                />
              </>
            )}

            <Button
              onClick={handleAdd}
              loading={saving}
              icon={<Plus size={15} />}
              className="w-full"
            >
              Save Payout Method
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
