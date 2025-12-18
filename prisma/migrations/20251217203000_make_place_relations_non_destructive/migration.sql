-- Prevent accidental hard deletes by removing cascading FKs for place category/log relations.

-- place_markers.categoryId -> place_categories.id (RESTRICT)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'place_markers_categoryId_fkey') THEN
    ALTER TABLE "place_markers" DROP CONSTRAINT "place_markers_categoryId_fkey";
  END IF;
  ALTER TABLE "place_markers"
    ADD CONSTRAINT "place_markers_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "place_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- place_logs.placeMarkerId -> place_markers.id (RESTRICT)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'place_logs_placeMarkerId_fkey') THEN
    ALTER TABLE "place_logs" DROP CONSTRAINT "place_logs_placeMarkerId_fkey";
  END IF;
  ALTER TABLE "place_logs"
    ADD CONSTRAINT "place_logs_placeMarkerId_fkey"
    FOREIGN KEY ("placeMarkerId") REFERENCES "place_markers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

