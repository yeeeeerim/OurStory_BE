-- Simplify PlaceMarker: category-only (remove visited/wishlist type)

ALTER TABLE "place_markers" DROP COLUMN IF EXISTS "visitedAt";
ALTER TABLE "place_markers" DROP COLUMN IF EXISTS "type";

-- MarkerType enum may remain if other migrations depend on it; safe to keep for now.

