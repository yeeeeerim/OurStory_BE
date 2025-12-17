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
CREATE INDEX "couple_messages_coupleId_idx" ON "couple_messages"("coupleId");

-- CreateIndex
CREATE UNIQUE INDEX "couple_messages_coupleId_authorId_key" ON "couple_messages"("coupleId", "authorId");

-- CreateIndex
CREATE INDEX "message_history_coupleId_authorId_idx" ON "message_history"("coupleId", "authorId");

-- CreateIndex
CREATE INDEX "message_history_createdAt_idx" ON "message_history"("createdAt");

-- AddForeignKey
ALTER TABLE "couple_messages" ADD CONSTRAINT "couple_messages_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_messages" ADD CONSTRAINT "couple_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
