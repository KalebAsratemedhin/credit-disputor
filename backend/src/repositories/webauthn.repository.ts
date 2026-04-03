import { WebAuthnChallengeKind } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function deleteRegistrationChallengesForUser(userId: string): Promise<void> {
  await prisma.webAuthnChallenge.deleteMany({
    where: { userId, kind: WebAuthnChallengeKind.REGISTRATION },
  });
}

export async function createRegistrationChallenge(data: {
  userId: string;
  challenge: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.webAuthnChallenge.create({
    data: {
      userId: data.userId,
      challenge: data.challenge,
      kind: WebAuthnChallengeKind.REGISTRATION,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findLatestRegistrationChallenge(userId: string) {
  return prisma.webAuthnChallenge.findFirst({
    where: {
      userId,
      kind: WebAuthnChallengeKind.REGISTRATION,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAuthenticationChallengesForUser(userId: string): Promise<void> {
  await prisma.webAuthnChallenge.deleteMany({
    where: { userId, kind: WebAuthnChallengeKind.AUTHENTICATION },
  });
}

export async function createAuthenticationChallenge(data: {
  userId: string;
  challenge: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.webAuthnChallenge.create({
    data: {
      userId: data.userId,
      challenge: data.challenge,
      kind: WebAuthnChallengeKind.AUTHENTICATION,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findLatestAuthenticationChallenge(userId: string) {
  return prisma.webAuthnChallenge.findFirst({
    where: {
      userId,
      kind: WebAuthnChallengeKind.AUTHENTICATION,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteWebauthnChallengeById(id: string): Promise<void> {
  await prisma.webAuthnChallenge.delete({ where: { id } }).catch(() => undefined);
}

export async function listWebauthnCredentialsForExclude(userId: string) {
  return prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });
}

export async function insertWebauthnCredential(data: {
  userId: string;
  credentialId: string;
  publicKey: Buffer;
  counter: bigint;
  transports: string | null;
  nickname: string;
}): Promise<void> {
  await prisma.webAuthnCredential.create({
    data: {
      userId: data.userId,
      credentialId: data.credentialId,
      publicKey: Buffer.from(data.publicKey),
      counter: data.counter,
      transports: data.transports,
      nickname: data.nickname,
    },
  });
}

export async function listWebauthnCredentialsForDisplay(userId: string) {
  return prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { id: true, nickname: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteWebauthnCredential(userId: string, credentialRowId: string): Promise<number> {
  const r = await prisma.webAuthnCredential.deleteMany({
    where: { id: credentialRowId, userId },
  });

  return r.count;
}

export async function countWebauthnCredentials(userId: string): Promise<number> {
  return prisma.webAuthnCredential.count({ where: { userId } });
}

export async function findWebauthnCredentialByUserAndCredentialId(userId: string, credentialId: string) {
  return prisma.webAuthnCredential.findFirst({
    where: { userId, credentialId },
    select: {
      id: true,
      credentialId: true,
      publicKey: true,
      counter: true,
      transports: true,
    },
  });
}

export async function updateWebauthnCredentialCounter(
  credentialRowId: string,
  userId: string,
  counter: bigint
): Promise<void> {
  await prisma.webAuthnCredential.updateMany({
    where: { id: credentialRowId, userId },
    data: { counter },
  });
}
