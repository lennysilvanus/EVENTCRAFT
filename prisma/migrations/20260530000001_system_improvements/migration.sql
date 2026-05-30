-- Database-backed rate limiting (replaces in-memory Map)
CREATE TABLE "RateLimit" (
  "key"     TEXT NOT NULL,
  "count"   INTEGER NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- AI generation quota tracking
ALTER TABLE "User" ADD COLUMN "aiGenerationsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "aiGenerationsResetAt" TIMESTAMP(3);

-- Performance indexes
CREATE INDEX IF NOT EXISTS "Guest_eventId_idx"          ON "Guest"("eventId");
CREATE INDEX IF NOT EXISTS "Guest_status_idx"           ON "Guest"("status");
CREATE INDEX IF NOT EXISTS "Guest_email_idx"            ON "Guest"("email");
CREATE INDEX IF NOT EXISTS "Event_hostId_idx"           ON "Event"("hostId");
CREATE INDEX IF NOT EXISTS "Event_status_idx"           ON "Event"("status");
CREATE INDEX IF NOT EXISTS "Event_date_idx"             ON "Event"("date");
CREATE INDEX IF NOT EXISTS "Event_isTemplate_idx"       ON "Event"("isTemplate");
CREATE INDEX IF NOT EXISTS "Payment_status_payout_idx"  ON "Payment"("status", "payoutStatus");
CREATE INDEX IF NOT EXISTS "Payment_eventId_idx"        ON "Payment"("eventId");
CREATE INDEX IF NOT EXISTS "HostPayoutMethod_userId_idx" ON "HostPayoutMethod"("userId");
