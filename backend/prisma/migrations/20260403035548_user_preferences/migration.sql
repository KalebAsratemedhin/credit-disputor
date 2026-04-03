-- CreateTable
CREATE TABLE "UserPreferences" (
    "userId" TEXT NOT NULL,
    "shareDataWithBureaus" BOOLEAN NOT NULL DEFAULT false,
    "analyticsAndImprovements" BOOLEAN NOT NULL DEFAULT false,
    "personalizedRecommendations" BOOLEAN NOT NULL DEFAULT false,
    "emailDisputeUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailScoreChanges" BOOLEAN NOT NULL DEFAULT true,
    "emailWeeklyReports" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT false,
    "pushBrowserNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushMobileNotifications" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
