import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import { env } from "../config/env";
import * as userRepository from "../repositories/user.repository";
import * as refreshTokenRepository from "../repositories/refreshToken.repository";
import { signinBodySchema, signupBodySchema, refreshBodySchema } from "../validation/auth.schemas";
import type { PublicUser } from "../types/user";
import {
  EmailTakenError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  NotFoundError,
  ValidationAppError,
} from "../errors/business";

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

export type AuthResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRefreshTokenValue(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function refreshTokenTtlMs(): number {
  const ttl = ms(env.refreshTokenExpiresIn as StringValue);
  if (ttl === undefined || ttl <= 0) {
    throw new Error(`Invalid REFRESH_TOKEN_EXPIRES_IN: ${env.refreshTokenExpiresIn}`);
  }
  return ttl;
}

function signAccessToken(userId: string, email: string): string {
  const options = { expiresIn: env.jwtAccessExpiresIn } as SignOptions;
  return jwt.sign({ sub: userId, email }, env.jwtSecret, options);
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = generateRefreshTokenValue();
  const tokenHash = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + refreshTokenTtlMs());
  await refreshTokenRepository.createRefreshToken({ userId, tokenHash, expiresAt });
  return raw;
}

async function issueTokenPair(user: PublicUser): Promise<AuthResponse> {
  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = await issueRefreshToken(user.id);
  return { user, accessToken, refreshToken };
}

export async function signup(rawBody: unknown): Promise<AuthResponse> {
  const parsed = signupBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const { email, password, fullName, phoneNumber } = parsed.data;

  const existing = await userRepository.findUserByEmail(email);
  if (existing) {
    throw new EmailTakenError();
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await userRepository.createUser({
      email,
      passwordHash,
      fullName,
      phoneNumber,
    });
    return await issueTokenPair(user);
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      throw new EmailTakenError();
    }
    throw e;
  }
}

export async function signin(rawBody: unknown): Promise<AuthResponse> {
  const parsed = signinBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const { email, password } = parsed.data;

  const userRecord = await userRepository.findUserByEmail(email);
  if (!userRecord) {
    throw new InvalidCredentialsError();
  }

  const ok = await bcrypt.compare(password, userRecord.passwordHash);
  if (!ok) {
    throw new InvalidCredentialsError();
  }

  const user = await userRepository.findUserById(userRecord.id);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  return await issueTokenPair(user);
}

export async function refresh(rawBody: unknown): Promise<AuthResponse> {
  const parsed = refreshBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const tokenHash = hashRefreshToken(parsed.data.refreshToken);
  const row = await refreshTokenRepository.findRefreshTokenByHash(tokenHash);
  if (!row || row.expiresAt <= new Date()) {
    throw new InvalidRefreshTokenError();
  }

  await refreshTokenRepository.deleteRefreshTokenById(row.id);

  const user = await userRepository.findUserById(row.userId);
  if (!user) {
    throw new InvalidRefreshTokenError();
  }

  return await issueTokenPair(user);
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }
  return user;
}
