-- Add template and recurrence fields to Event
ALTER TABLE "Event" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "recurrenceType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Event" ADD COLUMN "recurrenceEnd" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "parentEventId" TEXT;

-- Self-referential FK for recurring event series
ALTER TABLE "Event" ADD CONSTRAINT "Event_parentEventId_fkey"
  FOREIGN KEY ("parentEventId") REFERENCES "Event"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Event_isTemplate_idx" ON "Event"("isTemplate");
CREATE INDEX "Event_isPublic_idx" ON "Event"("isPublic");
CREATE INDEX "Event_parentEventId_idx" ON "Event"("parentEventId");
