import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import { OAuth2Client } from "google-auth-library";
import { EmailOtpPurpose } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import {
  EmailTakenError,
  EmailNotVerifiedError,
  GoogleAccountConflictError,
  GoogleSignInNotConfiguredError,
  InvalidCredentialsError,
  InvalidGoogleIdTokenError,
  InvalidPhoneNumberError,
  InvalidRefreshTokenError,
  NotFoundError,
  ResetTokenInvalidError,
  ValidationAppError,
} from "../lib/errors";
import { AppError } from "../lib/utils/errors";
import { logger } from "../lib/logger";
import * as backupCodeRepository from "../repositories/backupCode.repository";
import * as passwordResetRepository from "../repositories/passwordReset.repository";
import * as refreshTokenRepository from "../repositories/refreshToken.repository";
import * as totpRepository from "../repositories/totp.repository";
import * as userRepository from "../repositories/user.repository";
import * as webauthnRepository from "../repositories/webauthn.repository";
import { maskE164 } from "../lib/logPrivacy";
import { maskEmail } from "../lib/mfa/maskEmail";
import { signMfaToken } from "../lib/mfa/mfaToken";
import { verifyAndConsumeBackupCodeForUser } from "../lib/mfa/verifyBackupForUser";
import { verifyTotpCodeForUser } from "../lib/mfa/verifyTotpForUser";
import {
  forgotPasswordBodySchema,
  refreshBodySchema,
  resendEmailVerificationBodySchema,
  resetPasswordBodySchema,
  googleSignInBodySchema,
  signinBodySchema,
  signinMfaVerifyBodySchema,
  signupBodySchema,
  verifyEmailBodySchema,
  verifyPhoneCodeOnlyBodySchema,
} from "../lib/validation/auth.schemas";
import type {
  AuthResponse,
  MfaMethods,
  SigninMfaRequiredResponse,
  SigninResult,
  SignupPendingResponse,
} from "../lib/types/auth";
import type { PublicUser } from "../lib/types/user";
import { sendPasswordResetEmail } from "./email/email.service";
import {
  AUTH_OPAQUE_TOKEN_BYTES,
  BCRYPT_COST,
  FORGOT_PASSWORD_ACK,
  MS_PER_MINUTE,
  RESET_PASSWORD_SUCCESS_MESSAGE,
} from "../lib/constants";
import { toE164 } from "../lib/phone";
import * as otpService from "./otp.service";
import * as twilioVerifyService from "./twilioVerify.service";

const googleOAuthClient = new OAuth2Client();

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

async function buildMfaMethods(userId: string): Promise<MfaMethods> {
  const totp = await totpRepository.findUserTotpByUserId(userId);
  const backupRemaining = await backupCodeRepository.countUnusedBackupCodes(userId);
  const webauthnCount = await webauthnRepository.countWebauthnCredentials(userId);
  return {
    emailOtp: true,
    totp: totp?.enabled ?? false,
    backupCode: backupRemaining > 0,
    webauthn: webauthnCount > 0,
  };
}

function readEmailVerified(userRecord: unknown): boolean {
  return (userRecord as { emailVerified?: boolean } | null | undefined)?.emailVerified ?? false;
}

function readPhoneVerified(userRecord: unknown): boolean {
  return (userRecord as { phoneVerified?: boolean } | null | undefined)?.phoneVerified ?? false;
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

/** Issue session tokens after password sign-in MFA (email OTP, TOTP, backup, or WebAuthn). */
export async function issueAuthTokensAfterMfa(userId: string): Promise<AuthResponse> {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new InvalidCredentialsError();
  }
  return issueTokenPair(user);
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
  const { email, password, fullName, phoneNumber: rawPhone } = parsed.data;

  const existing = await userRepository.findUserByEmail(email);
  if (existing) {
    throw new EmailTakenError();
  }

  const phoneE164 = toE164(rawPhone);
  if (!phoneE164) {
    throw new InvalidPhoneNumberError();
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await userRepository.createUser({
      email,
      passwordHash,
      fullName,
      phoneNumber: phoneE164,
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

  const mfaMethods = await buildMfaMethods(user.id);
  return {
    mfaRequired: true,
    mfaToken: signMfaToken(user.id, user.email),
    maskedEmail: maskEmail(user.email),
    mfaMethods,
  };
}

/**
 * Post-login email OTP / TOTP / backup MFA applies to password sign-in only.
 * Google Identity Services is treated as sufficient authentication; tokens are issued immediately.
 */
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

export async function sendSigninMfaCode(userId: string): Promise<{ ok: true }> {
  const record = await userRepository.findUserRecordById(userId);
  if (!record) {
    throw new NotFoundError("User");
  }
  await otpService.sendOtp({
    userId,
    email: record.email,
    firstName: record.fullName.split(/\s+/)[0] ?? record.fullName,
    purpose: EmailOtpPurpose.SIGNIN,
  });
  return { ok: true };
}

export async function resendSigninMfaCode(userId: string): Promise<{ ok: true }> {
  return sendSigninMfaCode(userId);
}

export async function verifySigninMfa(userId: string, rawBody: unknown): Promise<AuthResponse> {
  const parsed = signinMfaVerifyBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const { kind, code } = parsed.data;

  if (kind === "email_otp") {
    const c = code.trim();
    if (!/^\d{4}$/.test(c)) {
      throw new ValidationAppError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "code must be exactly 4 digits",
            path: ["code"],
          },
        ])
      );
    }
    await otpService.verifyOtp({ userId, code: c, purpose: EmailOtpPurpose.SIGNIN });
  } else if (kind === "totp") {
    await verifyTotpCodeForUser(userId, code);
  } else {
    await verifyAndConsumeBackupCodeForUser(userId, code);
  }

  return issueAuthTokensAfterMfa(userId);
}

async function verifySignupEmailWithCode(email: string, code: string): Promise<AuthResponse> {
  const userRecord = await userRepository.findUserByEmail(email);
  if (!userRecord) {
    throw new InvalidCredentialsError();
  }

  await otpService.verifyOtp({
    userId: userRecord.id,
    code,
    purpose: EmailOtpPurpose.SIGNUP_VERIFY,
  });

  if (!readEmailVerified(userRecord)) {
    await userRepository.setEmailVerified(userRecord.id, true);
  }

  const user = await userRepository.findUserById(userRecord.id);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  return issueTokenPair(user);
}

async function resendSignupVerificationEmail(email: string): Promise<{ ok: true }> {
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
    purpose: EmailOtpPurpose.SIGNUP_VERIFY,
  });

  return { ok: true };
}

export async function verifyEmail(rawBody: unknown): Promise<AuthResponse> {
  const parsed = verifyEmailBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const { email, code } = parsed.data;
  return verifySignupEmailWithCode(email, code);
}

export async function resendEmailVerification(rawBody: unknown): Promise<{ ok: true }> {
  const parsed = resendEmailVerificationBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  return resendSignupVerificationEmail(parsed.data.email);
}

export async function sendPhoneVerificationForUser(userId: string): Promise<{ ok: true }> {
  const userRecord = await userRepository.findUserRecordById(userId);
  if (!userRecord) {
    logger.warn({ userId }, "sendPhoneVerificationForUser: user not found");
    throw new NotFoundError("User");
  }
  const phoneVerified = readPhoneVerified(userRecord);
  const hasPhone = Boolean(userRecord.phoneNumber);
  logger.info(
    {
      userId,
      hasPhone,
      phoneVerified,
      phoneMasked: userRecord.phoneNumber ? maskE164(userRecord.phoneNumber) : null,
    },
    "sendPhoneVerificationForUser: user record state"
  );
  if (!userRecord.phoneNumber || phoneVerified) {
    logger.info(
      { userId, reason: !userRecord.phoneNumber ? "no_phone_on_profile" : "already_verified" },
      "sendPhoneVerificationForUser: skipping Twilio (early return 200 ok)"
    );
    return { ok: true };
  }
  logger.info(
    { userId, phoneMasked: maskE164(userRecord.phoneNumber) },
    "sendPhoneVerificationForUser: calling Twilio startPhoneVerification"
  );
  await twilioVerifyService.startPhoneVerification(userRecord.phoneNumber);
  logger.info({ userId }, "sendPhoneVerificationForUser: Twilio start completed");
  return { ok: true };
}

export async function verifyPhoneForUser(userId: string, rawBody: unknown): Promise<{ ok: true; user: PublicUser }> {
  const parsed = verifyPhoneCodeOnlyBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }
  const userRecord = await userRepository.findUserRecordById(userId);
  if (!userRecord || !userRecord.phoneNumber) {
    logger.warn({ userId, hasRecord: Boolean(userRecord) }, "verifyPhoneForUser: user or phone missing");
    throw new NotFoundError("User");
  }
  const phoneVerified = readPhoneVerified(userRecord);
  logger.info(
    {
      userId,
      phoneVerified,
      phoneMasked: maskE164(userRecord.phoneNumber),
    },
    "verifyPhoneForUser: user record state"
  );
  if (phoneVerified) {
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }
    logger.info({ userId }, "verifyPhoneForUser: already verified, returning user");
    return { ok: true, user };
  }
  logger.info({ userId, phoneMasked: maskE164(userRecord.phoneNumber) }, "verifyPhoneForUser: calling Twilio check");
  await twilioVerifyService.checkPhoneVerification(userRecord.phoneNumber, parsed.data.code);
  await userRepository.setPhoneVerified(userId, true);
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }
  logger.info({ userId }, "verifyPhoneForUser: phone marked verified");
  return { ok: true, user };
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
