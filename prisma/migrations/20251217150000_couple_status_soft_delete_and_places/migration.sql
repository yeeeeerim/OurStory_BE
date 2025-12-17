-- Couple lifecycle + soft delete + place schema update (early-stage refactor)

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE "CoupleStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISCONNECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "JoinPolicy" AS ENUM ('CLOSED', 'OPEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExternalProvider" AS ENUM ('GOOGLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) couples: status + cancel + capacity
ALTER TABLE "couples"
  ADD COLUMN IF NOT EXISTS "status" "CoupleStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "maxMembers" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "joinPolicy" "JoinPolicy" NOT NULL DEFAULT 'CLOSED';

-- 3) couple_members: soft delete
ALTER TABLE "couple_members"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- 4) couple_invites: soft delete (optional but used for cancel cleanup)
ALTER TABLE "couple_invites"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- 5) places: google provider fields + soft delete; remove legacy categoryId relation
ALTER TABLE "places"
  ADD COLUMN IF NOT EXISTS "externalProvider" "ExternalProvider" NOT NULL DEFAULT 'GOOGLE',
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "normalizedName" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "places" DROP CONSTRAINT IF EXISTS "places_categoryId_fkey";
ALTER TABLE "places" DROP COLUMN IF EXISTS "categoryId";

-- 6) place_categories: make couple-scoped + add attributes + soft delete
DROP INDEX IF EXISTS "place_categories_name_key";

ALTER TABLE "place_categories"
  ADD COLUMN IF NOT EXISTS "coupleId" TEXT,
  ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#F5B5CF',
  ADD COLUMN IF NOT EXISTS "systemKey" TEXT,
  ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Postgres does not support `ADD CONSTRAINT IF NOT EXISTS`; use a guarded block.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'place_categories_coupleId_fkey'
  ) THEN
    ALTER TABLE "place_categories"
      ADD CONSTRAINT "place_categories_coupleId_fkey"
      FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill coupleId for existing rows (single-tenant legacy): pick first couple if any
UPDATE "place_categories"
SET "coupleId" = (SELECT "id" FROM "couples" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "coupleId" IS NULL;

ALTER TABLE "place_categories" ALTER COLUMN "coupleId" SET NOT NULL;

-- 7) place_markers: add categoryId + soft delete
ALTER TABLE "place_markers"
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Backfill categoryId to first category in couple (or any category as fallback)
UPDATE "place_markers" pm
SET "categoryId" = (
  SELECT pc."id"
  FROM "place_categories" pc
  WHERE pc."coupleId" = pm."coupleId"
  ORDER BY pc."isSystem" DESC, pc."id" ASC
  LIMIT 1
)
WHERE pm."categoryId" IS NULL;

ALTER TABLE "place_markers" ALTER COLUMN "categoryId" SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'place_markers_categoryId_fkey'
  ) THEN
    ALTER TABLE "place_markers"
      ADD CONSTRAINT "place_markers_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "place_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "places_external_provider_external_id_idx"
  ON "places"("externalProvider", "externalId");
