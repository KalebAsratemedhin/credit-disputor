-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- Backfill from old tables (definition slug + user value)
INSERT INTO "UserPreference" ("id", "userId", "key", "value", "updatedAt")
SELECT gen_random_uuid()::text, v."userId", d."key", v."value", v."updatedAt"
FROM "UserPreferenceValue" v
INNER JOIN "PreferenceDefinition" d ON d."id" = v."definitionId";

-- DropForeignKey
ALTER TABLE "UserPreferenceValue" DROP CONSTRAINT "UserPreferenceValue_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreferenceValue" DROP CONSTRAINT "UserPreferenceValue_definitionId_fkey";

-- DropTable
DROP TABLE "UserPreferenceValue";

-- DropTable
DROP TABLE "PreferenceDefinition";

-- DropEnum
DROP TYPE "PreferenceGroup";

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key_key" ON "UserPreference"("userId", "key");

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
