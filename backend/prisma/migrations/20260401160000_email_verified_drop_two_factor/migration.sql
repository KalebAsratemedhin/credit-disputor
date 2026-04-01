-- Add one-time email verification flag; grandfather existing users.
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Existing users were created under the old flow; mark them verified to avoid lockout.
UPDATE "User" SET "emailVerified" = true;

-- Remove legacy sign-in OTP flag (no longer used).
ALTER TABLE "User" DROP COLUMN "twoFactorRequired";

