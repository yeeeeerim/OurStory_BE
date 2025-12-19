/*
  Warnings:

  - You are about to drop the `todos` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ScheduleEventType" AS ENUM ('EVENT', 'TASK');

-- CreateEnum
CREATE TYPE "ScheduleTaskStatus" AS ENUM ('PENDING', 'DONE');

-- DropForeignKey
ALTER TABLE "todos" DROP CONSTRAINT "todos_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "todos" DROP CONSTRAINT "todos_coupleId_fkey";

-- AlterTable
ALTER TABLE "diary_comments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "diary_places" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "todos";

-- DropEnum
DROP TYPE "TodoStatus";

-- CreateTable
CREATE TABLE "schedule_labels" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "schedule_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_events" (
    "id" TEXT NOT NULL,
    "type" "ScheduleEventType" NOT NULL DEFAULT 'EVENT',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "status" "ScheduleTaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "coupleId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "labelId" TEXT,

    CONSTRAINT "schedule_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_labels_coupleId_idx" ON "schedule_labels"("coupleId");

-- CreateIndex
CREATE INDEX "schedule_events_coupleId_idx" ON "schedule_events"("coupleId");

-- CreateIndex
CREATE INDEX "schedule_events_date_idx" ON "schedule_events"("date");

-- CreateIndex
CREATE INDEX "schedule_events_labelId_idx" ON "schedule_events"("labelId");

-- AddForeignKey
ALTER TABLE "schedule_labels" ADD CONSTRAINT "schedule_labels_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "schedule_labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
