-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- CreateEnum
CREATE TYPE "WebAuthnChallengeKind" AS ENUM ('REGISTRATION');

-- CreateTable
CREATE TABLE "UserTotp" (
    "userId" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTotp_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserBackupCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBackupCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "kind" "WebAuthnChallengeKind" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "UserBackupCode_userId_idx" ON "UserBackupCode"("userId");

-- CreateIndex
CREATE INDEX "UserBackupCode_userId_batchId_idx" ON "UserBackupCode"("userId", "batchId");

-- CreateIndex
CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_userId_kind_idx" ON "WebAuthnChallenge"("userId", "kind");

-- AddForeignKey
ALTER TABLE "UserTotp" ADD CONSTRAINT "UserTotp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBackupCode" ADD CONSTRAINT "UserBackupCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnChallenge" ADD CONSTRAINT "WebAuthnChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
