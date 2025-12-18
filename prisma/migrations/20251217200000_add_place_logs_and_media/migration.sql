-- Add PlaceLog (place records) and Media (shared uploads)

DO $$ BEGIN
  CREATE TYPE "MediaType" AS ENUM ('DIARY', 'PLACE_LOG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "place_logs" (
  "id" TEXT NOT NULL,
  "visitedAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "coupleId" TEXT NOT NULL,
  "placeMarkerId" TEXT NOT NULL,
  CONSTRAINT "place_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "place_logs_coupleId_idx" ON "place_logs"("coupleId");
CREATE INDEX IF NOT EXISTS "place_logs_placeMarkerId_idx" ON "place_logs"("placeMarkerId");
CREATE INDEX IF NOT EXISTS "place_logs_visitedAt_idx" ON "place_logs"("visitedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'place_logs_coupleId_fkey') THEN
    ALTER TABLE "place_logs" ADD CONSTRAINT "place_logs_coupleId_fkey"
      FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'place_logs_placeMarkerId_fkey') THEN
    ALTER TABLE "place_logs" ADD CONSTRAINT "place_logs_placeMarkerId_fkey"
      FOREIGN KEY ("placeMarkerId") REFERENCES "place_markers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "media" (
  "id" TEXT NOT NULL,
  "type" "MediaType" NOT NULL,
  "url" TEXT NOT NULL,
  "originalName" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "uploadedById" TEXT NOT NULL,
  "placeLogId" TEXT,
  CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "media_type_idx" ON "media"("type");
CREATE INDEX IF NOT EXISTS "media_uploadedById_idx" ON "media"("uploadedById");
CREATE INDEX IF NOT EXISTS "media_placeLogId_idx" ON "media"("placeLogId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_uploadedById_fkey') THEN
    ALTER TABLE "media" ADD CONSTRAINT "media_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_placeLogId_fkey') THEN
    ALTER TABLE "media" ADD CONSTRAINT "media_placeLogId_fkey"
      FOREIGN KEY ("placeLogId") REFERENCES "place_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

