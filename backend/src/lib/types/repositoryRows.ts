import type { EmailOtpPurpose } from "@prisma/client";

export type PasswordResetRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type EmailOtpChallengeRow = {
  id: string;
  userId: string;
  purpose: EmailOtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
};

export type RefreshTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};
