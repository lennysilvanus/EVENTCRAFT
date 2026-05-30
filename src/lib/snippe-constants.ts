// Per-plan platform fee rates — applied to ticket sales
export const PLATFORM_FEE_RATES: Record<string, number> = {
  FREE:     0.04, // 4%
  PRO:      0.03, // 3%
  BUSINESS: 0.02, // 2%
};

// Legacy single-rate export kept for any callers not yet plan-aware
export const PLATFORM_FEE_RATE = 0.04;

export const NETWORKS = [
  { value: "mpesa",   label: "M-Pesa" },
  { value: "airtel",  label: "Airtel Money" },
  { value: "tigo",    label: "Tigo Pesa" },
  { value: "halotel", label: "Halotel" },
  { value: "mixx",    label: "Mixx by Yas" },
];

export const BANKS = [
  { code: "CRDB",    name: "CRDB Bank" },
  { code: "NMB",     name: "NMB Bank" },
  { code: "NBC",     name: "NBC" },
  { code: "STANBIC", name: "Stanbic Bank" },
  { code: "DTB",     name: "DTB" },
  { code: "ABSA",    name: "Absa Bank" },
  { code: "BOA",     name: "Bank of Africa" },
  { code: "EQUITY",  name: "Equity Bank" },
  { code: "KCB",     name: "KCB Bank" },
  { code: "EXIM",    name: "Exim Bank" },
];
