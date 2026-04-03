import { prisma } from "../lib/prisma";

export async function findUserTotpByUserId(userId: string) {
  return prisma.userTotp.findUnique({ where: { userId } });
}

export async function upsertPendingUserTotp(userId: string, secretEnc: string) {
  return prisma.userTotp.upsert({
    where: { userId },
    create: { userId, secretEnc, enabled: false },
    update: { secretEnc, enabled: false, verifiedAt: null },
  });
}

export async function markUserTotpEnabled(userId: string) {
  return prisma.userTotp.update({
    where: { userId },
    data: { enabled: true, verifiedAt: new Date() },
  });
}

export async function deleteUserTotpForUser(userId: string): Promise<void> {
  await prisma.userTotp.deleteMany({ where: { userId } });
}
