import type { PasswordResetRow } from "../lib/types/repositoryRows";
import { prisma } from "../lib/prisma";

export type { PasswordResetRow };

export async function deleteResetTokensForUser(userId: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
}

export async function createResetToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.passwordResetToken.create({
    data: {
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findResetTokenByHash(tokenHash: string): Promise<PasswordResetRow | null> {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
}

export async function markResetTokenUsed(id: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
