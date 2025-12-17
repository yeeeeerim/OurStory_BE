-- Ensure Place upsert key exists for external provider + id
-- Note: Postgres allows multiple NULLs, so manual places without externalId remain valid.

DO $$ BEGIN
  ALTER TABLE "places"
    ADD CONSTRAINT "places_externalProvider_externalId_key" UNIQUE ("externalProvider", "externalId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

