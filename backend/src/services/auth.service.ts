import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import { OAuth2Client } from "google-auth-library";
import { EmailOtpPurpose } from "@prisma/client";
import { env } from "../config/env";
import {
  EmailTakenError,
  EmailNotVerifiedError,
  GoogleAccountConflictError,
  GoogleSignInNotConfiguredError,
  InvalidCredentialsError,
  InvalidGoogleIdTokenError,
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
  googleSignInBodySchema,
  signinBodySchema,
  signupBodySchema,
  verifyOtpBodySchema,
  type OtpPurposeApi,
} from "../lib/validation/auth.schemas";
import type { PublicUser } from "../lib/types/user";
import { sendPasswordResetEmail } from "./email/email.service";
import {
  AUTH_OPAQUE_TOKEN_BYTES,
  BCRYPT_COST,
  FORGOT_PASSWORD_ACK,
  MS_PER_MINUTE,
  RESET_PASSWORD_SUCCESS_MESSAGE,
} from "../lib/constants";
import * as otpService from "./otp.service";

const googleOAuthClient = new OAuth2Client();

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
  return crypto.randomBytes(AUTH_OPAQUE_TOKEN_BYTES).toString("base64url");
}

function generatePasswordResetTokenValue(): string {
  return crypto.randomBytes(AUTH_OPAQUE_TOKEN_BYTES).toString("base64url");
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

async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
}> {
  if (env.googleClientIds.length === 0) {
    throw new GoogleSignInNotConfiguredError();
  }
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: env.googleClientIds,
    });
    
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new InvalidGoogleIdTokenError();
    }

    const email = payload.email.toLowerCase();
    const name =
      typeof payload.name === "string" && payload.name.trim().length > 0
        ? payload.name.trim()
        : (email.split("@")[0] ?? email);

    return { sub: payload.sub, email, name };
  } catch (e) {
    if (e instanceof AppError) {
      throw e;
    }
    throw new InvalidGoogleIdTokenError();
  }
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

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

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

  if (userRecord.passwordHash === null) {
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

export async function signInWithGoogle(rawBody: unknown): Promise<AuthResponse> {
  const parsed = googleSignInBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }

  const { sub, email, name } = await verifyGoogleIdToken(parsed.data.idToken);

  const bySub = await userRepository.findUserByGoogleSub(sub);
  if (bySub) {
    const user = await userRepository.findUserById(bySub.id);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    return await issueTokenPair(user);
  }

  const byEmail = await userRepository.findUserByEmail(email);
  if (byEmail) {
    if (byEmail.googleSub !== null && byEmail.googleSub !== sub) {
      throw new GoogleAccountConflictError();
    }

    const user = byEmail.googleSub
      ? await userRepository.findUserById(byEmail.id)
      : await userRepository.linkGoogleAccount(byEmail.id, sub);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    return await issueTokenPair(user);
  }

  try {
    const user = await userRepository.createOAuthUser({
      email,
      fullName: name,
      googleSub: sub,
    });

    return await issueTokenPair(user);
  } catch (e) {
    if (!isPrismaUniqueViolation(e)) {
      throw e;
    }

    const raced = await userRepository.findUserByEmail(email);
    if (!raced) {
      throw new GoogleAccountConflictError();
    }

    if (raced.googleSub !== null && raced.googleSub !== sub) {
      throw new GoogleAccountConflictError();
    }
    
    const user = raced.googleSub
      ? await userRepository.findUserById(raced.id)
      : await userRepository.linkGoogleAccount(raced.id, sub);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    return await issueTokenPair(user);
  }
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
  const ttlMin = Math.max(1, Math.round(passwordResetTtlMs() / MS_PER_MINUTE));
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

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await userRepository.updatePasswordHash(row.userId, passwordHash);
  await passwordResetRepository.markResetTokenUsed(row.id);
  await refreshTokenRepository.deleteRefreshTokensForUser(row.userId);

  return { message: RESET_PASSWORD_SUCCESS_MESSAGE };
}
