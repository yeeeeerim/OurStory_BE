-- CreateEnum
CREATE TYPE "AnniversaryType" AS ENUM ('CUSTOM', 'RELATIONSHIP', 'BIRTHDAY', 'MILESTONE');

-- AlterTable
ALTER TABLE "anniversaries" ADD COLUMN     "type" "AnniversaryType" NOT NULL DEFAULT 'CUSTOM';
