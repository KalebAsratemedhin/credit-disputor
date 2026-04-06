-- CreateEnum
CREATE TYPE "BureauConnectionState" AS ENUM ('AWAITING_IDENTITY', 'AWAITING_ADDRESS', 'AWAITING_CONSENT', 'AWAITING_EXPERIAN_KIQ', 'PROCESSING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "BureauCode" AS ENUM ('EXPERIAN', 'TRANSUNION', 'EQUIFAX');

-- CreateEnum
CREATE TYPE "BureauPullJobStatus" AS ENUM ('PENDING', 'PENDING_PROVIDER', 'IN_FLIGHT', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "BureauConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "BureauConnectionState" NOT NULL DEFAULT 'AWAITING_IDENTITY',
    "institutionId" TEXT,
    "identityPayloadEnc" TEXT,
    "addressPayloadEnc" TEXT,
    "experianAuthSessionEnc" TEXT,
    "experianConsumerTokenEnc" TEXT,
    "experianKiqPayloadEnc" TEXT,
    "lastProviderPollAt" TIMESTAMP(3),
    "userSafeFailureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BureauConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BureauConsentRecord" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "textHash" TEXT,
    "agreedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BureauConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BureauPullJob" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "bureau" "BureauCode" NOT NULL,
    "status" "BureauPullJobStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "errorCode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BureauPullJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "bureau" "BureauCode" NOT NULL,
    "score" INTEGER NOT NULL,
    "scoreType" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BureauConnection_userId_idx" ON "BureauConnection"("userId");

-- CreateIndex
CREATE INDEX "BureauConnection_userId_state_idx" ON "BureauConnection"("userId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "BureauConsentRecord_connectionId_key" ON "BureauConsentRecord"("connectionId");

-- CreateIndex
CREATE INDEX "BureauConsentRecord_userId_idx" ON "BureauConsentRecord"("userId");

-- CreateIndex
CREATE INDEX "BureauPullJob_connectionId_idx" ON "BureauPullJob"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "BureauPullJob_connectionId_bureau_key" ON "BureauPullJob"("connectionId", "bureau");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_userId_bureau_capturedAt_idx" ON "ScoreSnapshot"("userId", "bureau", "capturedAt");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_connectionId_idx" ON "ScoreSnapshot"("connectionId");

-- AddForeignKey
ALTER TABLE "BureauConnection" ADD CONSTRAINT "BureauConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BureauConsentRecord" ADD CONSTRAINT "BureauConsentRecord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BureauConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BureauPullJob" ADD CONSTRAINT "BureauPullJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BureauConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
