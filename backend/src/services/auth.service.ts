import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import { EmailOtpPurpose } from "@prisma/client";
import { env } from "../config/env";
import {
  EmailTakenError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  NotFoundError,
  ResetTokenInvalidError,
  ValidationAppError,
} from "../lib/errors";
import { AppError } from "../lib/utils/errors";
import { logger } from "../lib/logger";
import * as passwordResetRepository from "../repositories/passwordReset.repository";
import * as refreshTokenRepository from "../repositories/refreshToken.repository";
import * as userRepository from "../repositories/user.repository";
import {
  forgotPasswordBodySchema,
  refreshBodySchema,
  resendOtpBodySchema,
  resetPasswordBodySchema,
  signinBodySchema,
  signupBodySchema,
  verifyOtpBodySchema,
  type OtpPurposeApi,
} from "../lib/validation/auth.schemas";
import type { PublicUser } from "../lib/types/user";
import { sendPasswordResetEmail } from "./email/email.service";
import * as otpService from "./otp.service";

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

export type SignupPendingResponse = {
  user: PublicUser;
  verificationRequired: true;
};

export type SigninResult = AuthResponse;

function apiPurposeToDb(p: OtpPurposeApi): EmailOtpPurpose {
  void p;
  return EmailOtpPurpose.SIGNUP_VERIFY;
}

function readEmailVerified(userRecord: unknown): boolean {
  return (userRecord as { emailVerified?: boolean } | null | undefined)?.emailVerified ?? false;
}

function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function hashPasswordResetToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRefreshTokenValue(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generatePasswordResetTokenValue(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function refreshTokenTtlMs(): number {
  const ttl = ms(env.refreshTokenExpiresIn as StringValue);
  if (ttl === undefined || ttl <= 0) {
    throw new Error(`Invalid REFRESH_TOKEN_EXPIRES_IN: ${env.refreshTokenExpiresIn}`);
  }
  return ttl;
}

function passwordResetTtlMs(): number {
  const ttl = ms(env.passwordResetTtlMs as StringValue);
  if (ttl === undefined || ttl <= 0) {
    throw new Error(`Invalid PASSWORD_RESET_TTL_MS: ${env.passwordResetTtlMs}`);
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

export async function signup(rawBody: unknown): Promise<SignupPendingResponse> {
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
    await otpService.sendOtp({
      userId: user.id,
      email: user.email,
      firstName: user.fullName.split(/\s+/)[0] ?? user.fullName,
      purpose: EmailOtpPurpose.SIGNUP_VERIFY,
    });
    return { user, verificationRequired: true };
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      throw new EmailTakenError();
    }
    throw e;
  }
}

export async function signin(rawBody: unknown): Promise<SigninResult> {
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

  if (!readEmailVerified(userRecord)) {
    throw new EmailNotVerifiedError();
  }

  const user = await userRepository.findUserById(userRecord.id);
  if (!user) {
    throw new InvalidCredentialsError();
  }
  return await issueTokenPair(user);
}

export async function verifyOtp(rawBody: unknown): Promise<AuthResponse> {
  const parsed = verifyOtpBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const { email, code, purpose } = parsed.data;
  const dbPurpose = apiPurposeToDb(purpose);

  const userRecord = await userRepository.findUserByEmail(email);
  if (!userRecord) {
    throw new InvalidCredentialsError();
  }

  await otpService.verifyOtp({ userId: userRecord.id, code, purpose: dbPurpose });

  if (!readEmailVerified(userRecord)) {
    await userRepository.setEmailVerified(userRecord.id, true);
  }

  const user = await userRepository.findUserById(userRecord.id);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  return await issueTokenPair(user);
}

export async function resendOtp(rawBody: unknown): Promise<{ ok: true }> {
  const parsed = resendOtpBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const { email, purpose } = parsed.data;
  const dbPurpose = apiPurposeToDb(purpose);

  const userRecord = await userRepository.findUserByEmail(email);
  if (!userRecord) {
    return { ok: true };
  }

  if (readEmailVerified(userRecord)) {
    return { ok: true };
  }

  await otpService.sendOtp({
    userId: userRecord.id,
    email: userRecord.email,
    firstName: userRecord.fullName.split(/\s+/)[0] ?? userRecord.fullName,
    purpose: dbPurpose,
  });

  return { ok: true };
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

const FORGOT_PASSWORD_ACK =
  "If an account exists for that email, you will receive password reset instructions shortly.";

export async function forgotPassword(rawBody: unknown): Promise<{ message: string }> {
  const parsed = forgotPasswordBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const email = parsed.data.email.toLowerCase();
  const userRecord = await userRepository.findUserByEmail(email);

  if (!userRecord) {
    return { message: FORGOT_PASSWORD_ACK };
  }

  await passwordResetRepository.deleteResetTokensForUser(userRecord.id);
  const rawToken = generatePasswordResetTokenValue();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + passwordResetTtlMs());
  await passwordResetRepository.createResetToken({
    userId: userRecord.id,
    tokenHash,
    expiresAt,
  });

  const base = env.frontendUrl.replace(/\/$/, "");
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const ttlMin = Math.max(1, Math.round(passwordResetTtlMs() / 60_000));
  try {
    await sendPasswordResetEmail({
      to: userRecord.email,
      firstName: userRecord.fullName.split(/\s+/)[0] ?? userRecord.fullName,
      resetUrl,
      expiresInMinutes: ttlMin,
    });
  } catch (e) {
    logger.error(
      e instanceof AppError ? { err: e, errorCode: e.code } : { err: e },
      "Failed to send password reset email"
    );
  }

  return { message: FORGOT_PASSWORD_ACK };
}

export async function resetPassword(rawBody: unknown): Promise<{ message: string }> {
  const parsed = resetPasswordBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const { token, password } = parsed.data;
  const tokenHash = hashPasswordResetToken(token);
  const row = await passwordResetRepository.findResetTokenByHash(tokenHash);

  if (!row || row.usedAt || row.expiresAt <= new Date()) {
    throw new ResetTokenInvalidError();
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await userRepository.updatePasswordHash(row.userId, passwordHash);
  await passwordResetRepository.markResetTokenUsed(row.id);
  await refreshTokenRepository.deleteRefreshTokensForUser(row.userId);

  return { message: "Password has been reset. You can sign in with your new password." };
}
