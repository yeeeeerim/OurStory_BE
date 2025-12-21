-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('BOTH', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ScheduleEventType" AS ENUM ('EVENT', 'TASK');

-- CreateEnum
CREATE TYPE "ScheduleTaskStatus" AS ENUM ('PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "CoupleRole" AS ENUM ('OWNER', 'PARTNER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CoupleStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "JoinPolicy" AS ENUM ('CLOSED', 'OPEN');

-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('DIARY', 'PLACE_LOG');

-- CreateEnum
CREATE TYPE "AnniversaryType" AS ENUM ('CUSTOM', 'RELATIONSHIP', 'BIRTHDAY', 'MILESTONE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "nickname" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#F5B5CF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couples" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "status" "CoupleStatus" NOT NULL DEFAULT 'PENDING',
    "activatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "maxMembers" INTEGER NOT NULL DEFAULT 2,
    "joinPolicy" "JoinPolicy" NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couples_pkey" PRIMARY KEY ("id")
);

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
    "deletedAt" TIMESTAMP(3),
    "coupleId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "couple_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_members" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "CoupleRole" NOT NULL DEFAULT 'OWNER',
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "couple_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diaries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "weather" TEXT,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'BOTH',
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "coverImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "placeId" TEXT,

    CONSTRAINT "diaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "diaryId" TEXT NOT NULL,

    CONSTRAINT "diary_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_places" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "diaryId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "diary_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "diaryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "diary_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_tags" (
    "diaryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "diary_tags_pkey" PRIMARY KEY ("diaryId","tagId")
);

-- CreateTable
CREATE TABLE "place_categories" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "systemKey" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "place_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "externalProvider" "ExternalProvider" NOT NULL DEFAULT 'GOOGLE',
    "externalId" TEXT,
    "normalizedName" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_markers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "customTitle" TEXT,
    "diaryId" TEXT,
    "placeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "place_markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_logs" (
    "id" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "coupleId" TEXT NOT NULL,
    "placeMarkerId" TEXT NOT NULL,

    CONSTRAINT "place_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "placeLogId" TEXT,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anniversaries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "type" "AnniversaryType" NOT NULL DEFAULT 'CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "anniversaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bucketlist_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "bucketlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bucketlist_diaries" (
    "bucketlistItemId" TEXT NOT NULL,
    "diaryId" TEXT NOT NULL,

    CONSTRAINT "bucketlist_diaries_pkey" PRIMARY KEY ("bucketlistItemId","diaryId")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "pushNotify" BOOLEAN NOT NULL DEFAULT true,
    "anniversaryNotify" BOOLEAN NOT NULL DEFAULT true,
    "diaryReminder" BOOLEAN NOT NULL DEFAULT true,
    "emailNotify" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "couple_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couple_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_history" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "couple_invites_code_key" ON "couple_invites"("code");

-- CreateIndex
CREATE INDEX "couple_invites_coupleId_idx" ON "couple_invites"("coupleId");

-- CreateIndex
CREATE INDEX "couple_invites_status_idx" ON "couple_invites"("status");

-- CreateIndex
CREATE INDEX "couple_members_coupleId_idx" ON "couple_members"("coupleId");

-- CreateIndex
CREATE UNIQUE INDEX "couple_members_userId_coupleId_key" ON "couple_members"("userId", "coupleId");

-- CreateIndex
CREATE INDEX "diaries_coupleId_idx" ON "diaries"("coupleId");

-- CreateIndex
CREATE INDEX "diaries_authorId_idx" ON "diaries"("authorId");

-- CreateIndex
CREATE INDEX "diary_images_diaryId_idx" ON "diary_images"("diaryId");

-- CreateIndex
CREATE INDEX "diary_places_diaryId_idx" ON "diary_places"("diaryId");

-- CreateIndex
CREATE INDEX "diary_places_placeId_idx" ON "diary_places"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "diary_places_diaryId_placeId_key" ON "diary_places"("diaryId", "placeId");

-- CreateIndex
CREATE INDEX "diary_comments_diaryId_idx" ON "diary_comments"("diaryId");

-- CreateIndex
CREATE INDEX "diary_comments_authorId_idx" ON "diary_comments"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "places_externalProvider_externalId_key" ON "places"("externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "place_markers_coupleId_idx" ON "place_markers"("coupleId");

-- CreateIndex
CREATE INDEX "place_markers_placeId_idx" ON "place_markers"("placeId");

-- CreateIndex
CREATE INDEX "place_markers_categoryId_idx" ON "place_markers"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "place_markers_coupleId_placeId_key" ON "place_markers"("coupleId", "placeId");

-- CreateIndex
CREATE INDEX "place_logs_coupleId_idx" ON "place_logs"("coupleId");

-- CreateIndex
CREATE INDEX "place_logs_placeMarkerId_idx" ON "place_logs"("placeMarkerId");

-- CreateIndex
CREATE INDEX "place_logs_visitedAt_idx" ON "place_logs"("visitedAt");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "media_uploadedById_idx" ON "media"("uploadedById");

-- CreateIndex
CREATE INDEX "media_placeLogId_idx" ON "media"("placeLogId");

-- CreateIndex
CREATE INDEX "anniversaries_coupleId_idx" ON "anniversaries"("coupleId");

-- CreateIndex
CREATE INDEX "bucketlist_items_coupleId_idx" ON "bucketlist_items"("coupleId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "schedule_labels_coupleId_idx" ON "schedule_labels"("coupleId");

-- CreateIndex
CREATE INDEX "schedule_events_coupleId_idx" ON "schedule_events"("coupleId");

-- CreateIndex
CREATE INDEX "schedule_events_date_idx" ON "schedule_events"("date");

-- CreateIndex
CREATE INDEX "schedule_events_labelId_idx" ON "schedule_events"("labelId");

-- CreateIndex
CREATE INDEX "couple_messages_coupleId_idx" ON "couple_messages"("coupleId");

-- CreateIndex
CREATE UNIQUE INDEX "couple_messages_coupleId_authorId_key" ON "couple_messages"("coupleId", "authorId");

-- CreateIndex
CREATE INDEX "message_history_coupleId_authorId_idx" ON "message_history"("coupleId", "authorId");

-- CreateIndex
CREATE INDEX "message_history_createdAt_idx" ON "message_history"("createdAt");

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
ALTER TABLE "diaries" ADD CONSTRAINT "diaries_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diaries" ADD CONSTRAINT "diaries_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "diary_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_images" ADD CONSTRAINT "diary_images_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_places" ADD CONSTRAINT "diary_places_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_places" ADD CONSTRAINT "diary_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_comments" ADD CONSTRAINT "diary_comments_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_comments" ADD CONSTRAINT "diary_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_tags" ADD CONSTRAINT "diary_tags_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_tags" ADD CONSTRAINT "diary_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_categories" ADD CONSTRAINT "place_categories_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_markers" ADD CONSTRAINT "place_markers_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_markers" ADD CONSTRAINT "place_markers_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_markers" ADD CONSTRAINT "place_markers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "place_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_markers" ADD CONSTRAINT "place_markers_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_logs" ADD CONSTRAINT "place_logs_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_logs" ADD CONSTRAINT "place_logs_placeMarkerId_fkey" FOREIGN KEY ("placeMarkerId") REFERENCES "place_markers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_placeLogId_fkey" FOREIGN KEY ("placeLogId") REFERENCES "place_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anniversaries" ADD CONSTRAINT "anniversaries_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bucketlist_items" ADD CONSTRAINT "bucketlist_items_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bucketlist_diaries" ADD CONSTRAINT "bucketlist_diaries_bucketlistItemId_fkey" FOREIGN KEY ("bucketlistItemId") REFERENCES "bucketlist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bucketlist_diaries" ADD CONSTRAINT "bucketlist_diaries_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_labels" ADD CONSTRAINT "schedule_labels_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "schedule_labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_messages" ADD CONSTRAINT "couple_messages_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_messages" ADD CONSTRAINT "couple_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
