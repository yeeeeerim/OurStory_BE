-- DropIndex
DROP INDEX "places_external_provider_external_id_idx";

-- AlterTable
ALTER TABLE "place_categories" ALTER COLUMN "color" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "place_markers_categoryId_idx" ON "place_markers"("categoryId");
