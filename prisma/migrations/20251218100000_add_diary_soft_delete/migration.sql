-- Add soft-delete support for diaries
ALTER TABLE "diaries"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "diaries_deletedAt_idx" ON "diaries" ("deletedAt");

