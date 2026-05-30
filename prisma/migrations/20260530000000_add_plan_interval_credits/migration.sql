-- Add billing interval and pay-per-event credits to User
ALTER TABLE "User" ADD COLUMN "planInterval" TEXT NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "User" ADD COLUMN "eventCredits" INTEGER NOT NULL DEFAULT 0;
