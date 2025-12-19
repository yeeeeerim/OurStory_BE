-- Diary enhancements: cover image, soft-delete images, places (M:N), comments

ALTER TABLE "diaries"
  ADD COLUMN IF NOT EXISTS "coverImageId" TEXT;

ALTER TABLE "diary_images"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "diary_places" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "diaryId" TEXT NOT NULL,
  "placeId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "diary_places_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diary_places_diaryId_fkey'
  ) THEN
    ALTER TABLE "diary_places"
      ADD CONSTRAINT "diary_places_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diary_places_placeId_fkey'
  ) THEN
    ALTER TABLE "diary_places"
      ADD CONSTRAINT "diary_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "diary_places_diaryId_placeId_key" ON "diary_places" ("diaryId","placeId");
CREATE INDEX IF NOT EXISTS "diary_places_diaryId_idx" ON "diary_places" ("diaryId");
CREATE INDEX IF NOT EXISTS "diary_places_placeId_idx" ON "diary_places" ("placeId");

CREATE TABLE IF NOT EXISTS "diary_comments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "diaryId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  CONSTRAINT "diary_comments_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diary_comments_diaryId_fkey'
  ) THEN
    ALTER TABLE "diary_comments"
      ADD CONSTRAINT "diary_comments_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diary_comments_authorId_fkey'
  ) THEN
    ALTER TABLE "diary_comments"
      ADD CONSTRAINT "diary_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "diary_comments_diaryId_idx" ON "diary_comments" ("diaryId");
CREATE INDEX IF NOT EXISTS "diary_comments_authorId_idx" ON "diary_comments" ("authorId");

-- Cover image FK (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diaries_coverImageId_fkey'
  ) THEN
    ALTER TABLE "diaries"
      ADD CONSTRAINT "diaries_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "diary_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

