/*
  Warnings:

  - The `role` column on the `couple_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `inviteCode` on the `couples` table. All the data in the column will be lost.
  - Made the column `coupleId` on table `place_markers` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CoupleRole" AS ENUM ('OWNER', 'PARTNER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'REVOKED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "anniversaries" DROP CONSTRAINT "anniversaries_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "bucketlist_items" DROP CONSTRAINT "bucketlist_items_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "couple_members" DROP CONSTRAINT "couple_members_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "couple_members" DROP CONSTRAINT "couple_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "diaries" DROP CONSTRAINT "diaries_authorId_fkey";

-- DropForeignKey
ALTER TABLE "diaries" DROP CONSTRAINT "diaries_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "notification_settings" DROP CONSTRAINT "notification_settings_userId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "place_markers" DROP CONSTRAINT "place_markers_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "place_markers" DROP CONSTRAINT "place_markers_placeId_fkey";

-- DropForeignKey
ALTER TABLE "todos" DROP CONSTRAINT "todos_coupleId_fkey";

-- DropIndex
DROP INDEX "couples_inviteCode_key";

-- AlterTable
ALTER TABLE "couple_members" DROP COLUMN "role",
ADD COLUMN     "role" "CoupleRole" NOT NULL DEFAULT 'OWNER';

-- AlterTable
ALTER TABLE "couples" DROP COLUMN "inviteCode";

-- AlterTable
ALTER TABLE "place_markers" ALTER COLUMN "coupleId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "couple_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "couple_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "couple_invites_code_key" ON "couple_invites"("code");

-- CreateIndex
CREATE INDEX "couple_invites_coupleId_idx" ON "couple_invites"("coupleId");

-- CreateIndex
CREATE INDEX "couple_invites_status_idx" ON "couple_invites"("status");

-- CreateIndex
CREATE INDEX "anniversaries_coupleId_idx" ON "anniversaries"("coupleId");

-- CreateIndex
CREATE INDEX "bucketlist_items_coupleId_idx" ON "bucketlist_items"("coupleId");

-- CreateIndex
CREATE INDEX "couple_members_coupleId_idx" ON "couple_members"("coupleId");

-- CreateIndex
CREATE INDEX "diaries_coupleId_idx" ON "diaries"("coupleId");

-- CreateIndex
CREATE INDEX "diaries_authorId_idx" ON "diaries"("authorId");

-- CreateIndex
CREATE INDEX "diary_images_diaryId_idx" ON "diary_images"("diaryId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "place_markers_coupleId_idx" ON "place_markers"("coupleId");

-- CreateIndex
CREATE INDEX "place_markers_placeId_idx" ON "place_markers"("placeId");

-- CreateIndex
CREATE INDEX "todos_coupleId_idx" ON "todos"("coupleId");

-- CreateIndex
CREATE INDEX "todos_assigneeId_idx" ON "todos"("assigneeId");

-- AddForeignKey
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diaries" ADD CONSTRAINT "diaries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diaries" ADD CONSTRAINT "diaries_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_markers" ADD CONSTRAINT "place_markers_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_markers" ADD CONSTRAINT "place_markers_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anniversaries" ADD CONSTRAINT "anniversaries_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bucketlist_items" ADD CONSTRAINT "bucketlist_items_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
