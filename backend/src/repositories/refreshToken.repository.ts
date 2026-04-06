import type { RefreshTokenRow } from "../lib/types/repositoryRows";
import { prisma } from "../lib/prisma";

export type { RefreshTokenRow };

export async function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  return row;
}

export async function deleteRefreshTokenById(id: string): Promise<void> {
  await prisma.refreshToken.delete({ where: { id } });
}

export async function deleteRefreshTokensForUser(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
