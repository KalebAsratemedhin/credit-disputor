import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { PublicUser } from "../lib/types/user";

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findUserByGoogleSub(googleSub: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { googleSub } });
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

export async function findUserRecordById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  fullName: string;
  phoneNumber: string;
}): Promise<PublicUser> {
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
    },
  });
  return toPublicUser(user);
}

export async function createOAuthUser(data: {
  email: string;
  fullName: string;
  googleSub: string;
}): Promise<PublicUser> {
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      googleSub: data.googleSub,
      emailVerified: true,
      passwordHash: null,
      phoneNumber: null,
    },
  });
  return toPublicUser(user);
}

export async function linkGoogleAccount(userId: string, googleSub: string): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { googleSub, emailVerified: true },
  });
  return toPublicUser(user);
}

export async function setEmailVerified(userId: string, verified: boolean): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: verified },
  });
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function updateProfile(
  userId: string,
  data: { fullName?: string; phoneNumber?: string | null }
): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
    },
  });
  return toPublicUser(user);
}

export async function updateAvatarUrl(userId: string, avatarUrl: string | null): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });
  return toPublicUser(user);
}
