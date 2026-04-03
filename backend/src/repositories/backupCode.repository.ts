import { prisma } from "../lib/prisma";

async function createBackupCodes(
  userId: string,
  batchId: string,
  codeHashes: string[]
): Promise<void> {
  await prisma.userBackupCode.createMany({
    data: codeHashes.map((codeHash) => ({ userId, batchId, codeHash })),
  });
}

export async function deleteBackupCodesForUser(userId: string): Promise<void> {
  await prisma.userBackupCode.deleteMany({ where: { userId } });
}

export async function replaceBackupCodesForUser(
  userId: string,
  batchId: string,
  codeHashes: string[]
): Promise<void> {
  await prisma.userBackupCode.deleteMany({ where: { userId } });
  await createBackupCodes(userId, batchId, codeHashes);
}

export async function countUnusedBackupCodes(userId: string): Promise<number> {
  return prisma.userBackupCode.count({
    where: { userId, usedAt: null },
  });
}

export async function listUnusedBackupCodeRows(userId: string): Promise<Array<{ id: string; codeHash: string }>> {
  return prisma.userBackupCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  });
}

export async function markBackupCodeUsedById(userId: string, id: string): Promise<boolean> {
  const r = await prisma.userBackupCode.updateMany({
    where: { id, userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return r.count > 0;
}
