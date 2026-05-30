-- ─────────────────────────────────────────────────────────────────────────────
-- Risk-fix migration
-- Covers: S16 (AI counter), S15/B06 (PayoutLog), S17 (webhook idempotency),
--         B07 (ConsentRecord), B09 (audit trail completeness)
-- ─────────────────────────────────────────────────────────────────────────────

-- B07: PDPA consent capture
CREATE TABLE "ConsentRecord" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "version"   TEXT NOT NULL DEFAULT '1.0',
  "ip"        TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");
ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- B06: Payout audit trail for dispute resolution
CREATE TABLE "PayoutLog" (
  "id"            TEXT NOT NULL,
  "paymentId"     TEXT NOT NULL,
  "amount"        DOUBLE PRECISION NOT NULL,
  "phone"         TEXT,
  "network"       TEXT,
  "bankCode"      TEXT,
  "accountNumber" TEXT,
  "payoutId"      TEXT,
  "status"        TEXT NOT NULL,
  "errorMessage"  TEXT,
  "rawResponse"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayoutLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayoutLog_paymentId_idx" ON "PayoutLog"("paymentId");
ALTER TABLE "PayoutLog"
  ADD CONSTRAINT "PayoutLog_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- S17: Webhook idempotency — track processing state so partial failures are retryable
ALTER TABLE "ProcessedWebhookEvent"
  ADD COLUMN "status"       TEXT NOT NULL DEFAULT 'DONE',
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
