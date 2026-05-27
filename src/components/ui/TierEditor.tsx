"use client";

import { Plus, Trash2, ChevronDown, ChevronUp, Star } from "lucide-react";
import { getPresetsForCategory } from "@/lib/ticketPresets";

export interface TierDraft {
  id?: string;
  name: string;
  description: string;
  price: string;
  capacity: string;
  sortOrder: number;
}

interface Props {
  tiers: TierDraft[];
  currency: string;
  category: string;
  onChange: (tiers: TierDraft[]) => void;
}

const TIER_COLORS = [
  { label: "Regular", badge: "bg-slate-500/20 text-slate-300" },
  { label: "VIP", badge: "bg-indigo-500/20 text-indigo-300" },
  { label: "VVIP", badge: "bg-amber-500/20 text-amber-300" },
];

function getBadge(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("vvip") || lower.includes("platinum") || lower.includes("executive") || lower.includes("suite")) {
    return "bg-amber-500/20 text-amber-300 border border-amber-500/20";
  }
  if (lower.includes("vip") || lower.includes("premium") || lower.includes("gold")) {
    return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20";
  }
  return "bg-slate-500/20 text-slate-300 border border-slate-500/20";
}

export default function TierEditor({ tiers, currency, category, onChange }: Props) {
  const addTier = () => {
    onChange([...tiers, { name: "", description: "", price: "", capacity: "", sortOrder: tiers.length }]);
  };

  const removeTier = (idx: number) => {
    onChange(tiers.filter((_, i) => i !== idx));
  };

  const updateTier = (idx: number, field: keyof TierDraft, value: string) => {
    onChange(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const moveTier = (idx: number, dir: -1 | 1) => {
    const next = [...tiers];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.map((t, i) => ({ ...t, sortOrder: i })));
  };

  const applyPreset = () => {
    const presets = getPresetsForCategory(category);
    onChange(presets.map((p, i) => ({
      name: p.name,
      description: p.description,
      price: "",
      capacity: "",
      sortOrder: i,
    })));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Preset button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Define the ticket tiers guests can choose from.</p>
        <button
          type="button"
          onClick={applyPreset}
          className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Star size={11} />
          Use {category} presets
        </button>
      </div>

      {/* Tier rows */}
      <div className="flex flex-col gap-3">
        {tiers.map((tier, idx) => (
          <div key={idx} className="border border-border rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/40">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveTier(idx, -1)} disabled={idx === 0} className="text-slate-600 hover:text-slate-400 disabled:opacity-30 transition-colors">
                  <ChevronUp size={12} />
                </button>
                <button type="button" onClick={() => moveTier(idx, 1)} disabled={idx === tiers.length - 1} className="text-slate-600 hover:text-slate-400 disabled:opacity-30 transition-colors">
                  <ChevronDown size={12} />
                </button>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBadge(tier.name || "regular")}`}>
                {tier.name || `Tier ${idx + 1}`}
              </span>
              <div className="flex-1" />
              {tier.price && (
                <span className="text-sm font-semibold text-white">
                  {currency} {parseFloat(tier.price || "0").toLocaleString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeTier(idx)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Remove tier"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Fields */}
            <div className="px-4 py-4 grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Tier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. VIP"
                  value={tier.name}
                  onChange={e => updateTier(idx, "name", e.target.value)}
                  className="w-full bg-slate-900 border border-border text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Price ({currency}) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  min="0"
                  value={tier.price}
                  onChange={e => updateTier(idx, "price", e.target.value)}
                  className="w-full bg-slate-900 border border-border text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Reserved seating + welcome drink"
                  value={tier.description}
                  onChange={e => updateTier(idx, "description", e.target.value)}
                  className="w-full bg-slate-900 border border-border text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">Capacity <span className="text-slate-600">(leave empty = unlimited)</span></label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  min="1"
                  value={tier.capacity}
                  onChange={e => updateTier(idx, "capacity", e.target.value)}
                  className="w-full bg-slate-900 border border-border text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addTier}
        className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-border rounded-xl text-sm text-slate-500 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-600/5 transition-all"
      >
        <Plus size={15} /> Add Custom Tier
      </button>
    </div>
  );
}
