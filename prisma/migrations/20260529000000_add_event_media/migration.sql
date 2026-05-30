-- Add media fields to Event
ALTER TABLE "Event" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "posterImage" TEXT;

-- EventMedia gallery table
CREATE TABLE "EventMedia" (
  "id"        TEXT NOT NULL,
  "url"       TEXT NOT NULL,
  "caption"   TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventId"   TEXT NOT NULL,
  CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "EventMedia_eventId_idx" ON "EventMedia"("eventId");
