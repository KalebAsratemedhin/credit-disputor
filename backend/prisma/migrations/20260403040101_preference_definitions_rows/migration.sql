/*
  Warnings:

  - You are about to drop the `UserPreferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PreferenceGroup" AS ENUM ('PRIVACY', 'EMAIL_NOTIFICATION', 'PUSH_NOTIFICATION');

-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_userId_fkey";

-- DropTable
DROP TABLE "UserPreferences";

-- CreateTable
CREATE TABLE "PreferenceDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "group" "PreferenceGroup" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "defaultValue" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferenceValue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferenceValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceDefinition_key_key" ON "PreferenceDefinition"("key");

-- CreateIndex
CREATE INDEX "PreferenceDefinition_group_sortOrder_idx" ON "PreferenceDefinition"("group", "sortOrder");

-- CreateIndex
CREATE INDEX "UserPreferenceValue_userId_idx" ON "UserPreferenceValue"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferenceValue_userId_definitionId_key" ON "UserPreferenceValue"("userId", "definitionId");

-- AddForeignKey
ALTER TABLE "UserPreferenceValue" ADD CONSTRAINT "UserPreferenceValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferenceValue" ADD CONSTRAINT "UserPreferenceValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "PreferenceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
