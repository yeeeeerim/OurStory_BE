-- PlaceMarker: allow per-couple custom label and prevent duplicate marker per place

ALTER TABLE "place_markers"
  ADD COLUMN IF NOT EXISTS "customTitle" TEXT;

DO $$ BEGIN
  ALTER TABLE "place_markers"
    ADD CONSTRAINT "place_markers_coupleId_placeId_key" UNIQUE ("coupleId", "placeId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

