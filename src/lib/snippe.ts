import crypto from "crypto";
import { PLATFORM_FEE_RATE, NETWORKS, BANKS } from "./snippe-constants";
export { PLATFORM_FEE_RATE, NETWORKS, BANKS };

const SNIPPE_BASE = "https://api.snippe.sh";
const SNIPPE_API_KEY = process.env.SNIPPE_API_KEY ?? "";

function headers(idempotencyKey?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Authorization": `Bearer ${SNIPPE_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;
  return h;
}

export interface CollectionResult {
  transactionId: string;
  status: string;
}

export async function initiateCollection(opts: {
  amount: number;
  phone: string;
  network: string;
  description: string;
  reference: string;
}): Promise<CollectionResult> {
  if (!SNIPPE_API_KEY) throw new Error("SNIPPE_API_KEY is not configured");

  const res = await fetch(`${SNIPPE_BASE}/v1/payments`, {
    method: "POST",
    headers: headers(opts.reference),
    body: JSON.stringify({
      amount: Math.round(opts.amount),
      phone: opts.phone,
      network: opts.network,
      description: opts.description,
      reference: opts.reference,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Snippe collection failed");

  return {
    transactionId: json.data.transaction_id,
    status: json.data.status,
  };
}

export interface DisbursementResult {
  disbursementId: string;
  status: string;
}

export async function disburseMobileMoney(opts: {
  amount: number;
  phone: string;
  network: string;
  reference: string;
}): Promise<DisbursementResult> {
  if (!SNIPPE_API_KEY) throw new Error("SNIPPE_API_KEY is not configured");

  const res = await fetch(`${SNIPPE_BASE}/v1/disbursements`, {
    method: "POST",
    headers: headers(`disb-${opts.reference}`),
    body: JSON.stringify({
      amount: Math.round(opts.amount),
      phone: opts.phone,
      network: opts.network,
      type: "mobile_money",
      reference: opts.reference,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Snippe disbursement failed");

  return {
    disbursementId: json.data.disbursement_id,
    status: json.data.status,
  };
}

export async function disburseBank(opts: {
  amount: number;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  reference: string;
}): Promise<DisbursementResult> {
  if (!SNIPPE_API_KEY) throw new Error("SNIPPE_API_KEY is not configured");

  const res = await fetch(`${SNIPPE_BASE}/v1/disbursements`, {
    method: "POST",
    headers: headers(`disb-${opts.reference}`),
    body: JSON.stringify({
      amount: Math.round(opts.amount),
      account_number: opts.accountNumber,
      bank_code: opts.bankCode,
      account_name: opts.accountName,
      type: "bank_transfer",
      reference: opts.reference,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Snippe bank disbursement failed");

  return {
    disbursementId: json.data.disbursement_id,
    status: json.data.status,
  };
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.SNIPPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Security] SNIPPE_WEBHOOK_SECRET is not set — rejecting webhook");
    return false; // fail closed: never accept unverified webhooks
  }
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  // Timing-safe comparison prevents timing-oracle attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false; // lengths differ
  }
}
