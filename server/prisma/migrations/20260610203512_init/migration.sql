-- CreateTable
CREATE TABLE "User" (
    "cometchatUid" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterUid" TEXT NOT NULL,
    "recipientUid" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Friendship_requesterUid_fkey" FOREIGN KEY ("requesterUid") REFERENCES "User" ("cometchatUid") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Friendship_recipientUid_fkey" FOREIGN KEY ("recipientUid") REFERENCES "User" ("cometchatUid") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Friendship_requesterUid_recipientUid_idx" ON "Friendship"("requesterUid", "recipientUid");

-- CreateIndex
CREATE INDEX "Friendship_recipientUid_status_idx" ON "Friendship"("recipientUid", "status");
