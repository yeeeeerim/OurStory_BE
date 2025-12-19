-- AlterTable
ALTER TABLE "diary_comments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "diary_places" ALTER COLUMN "id" DROP DEFAULT;
