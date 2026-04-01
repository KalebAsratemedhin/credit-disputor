import type { EmailOtpPurpose } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type EmailOtpChallengeRow = {
  id: string;
  userId: string;
  purpose: EmailOtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
};

export async function invalidateActiveChallenges(userId: string, purpose: EmailOtpPurpose): Promise<void> {
  await prisma.emailOtpChallenge.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
}

export async function createChallenge(data: {
  userId: string;
  purpose: EmailOtpPurpose;
  codeHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.emailOtpChallenge.create({
    data: {
      userId: data.userId,
      purpose: data.purpose,
      codeHash: data.codeHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findLatestActiveChallenge(
  userId: string,
  purpose: EmailOtpPurpose
): Promise<EmailOtpChallengeRow | null> {
  const now = new Date();
  const row = await prisma.emailOtpChallenge.findFirst({
    where: {
      userId,
      purpose,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  return row;
}

export async function incrementChallengeAttempts(id: string): Promise<void> {
  await prisma.emailOtpChallenge.update({
    where: { id },
    data: { attemptCount: { increment: 1 } },
  });
}

export async function consumeChallenge(id: string): Promise<void> {
  await prisma.emailOtpChallenge.update({
    where: { id },
    data: { consumedAt: new Date() },
  });
}
