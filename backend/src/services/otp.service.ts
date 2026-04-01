import crypto from "crypto";
import type { EmailOtpPurpose } from "@prisma/client";
import ms, { type StringValue } from "ms";
import { env } from "../config/env";
import { OtpInvalidError } from "../lib/errors";
import { AppError } from "../lib/utils/errors";
import { logger } from "../lib/logger";
import * as emailOtpRepository from "../repositories/emailOtp.repository";
import { sendOtpCodeEmail } from "./email/email.service";

const OTP_MAX_ATTEMPTS = 5;

function otpTtlMs(): number {
  const t = ms(env.otpTtlMs as StringValue);
  if (t === undefined || t <= 0) {
    throw new Error(`Invalid OTP_TTL_MS: ${env.otpTtlMs}`);
  }
  return t;
}

export function hashOtpCode(code: string): string {
  return crypto.createHmac("sha256", env.otpCodeSecret).update(code).digest("hex");
}

function generateFourDigitCode(): string {
  const n = crypto.randomInt(0, 10000);
  return String(n).padStart(4, "0");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) {
      return false;
    }
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function purposeLabel(purpose: EmailOtpPurpose): string {
  void purpose;
  return "Verify your email";
}

export async function sendOtp(params: {
  userId: string;
  email: string;
  firstName: string;
  purpose: EmailOtpPurpose;
}): Promise<void> {
  const { userId, email, firstName, purpose } = params;
  await emailOtpRepository.invalidateActiveChallenges(userId, purpose);
  const code = generateFourDigitCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + otpTtlMs());
  await emailOtpRepository.createChallenge({ userId, purpose, codeHash, expiresAt });

  const ttlMin = Math.max(1, Math.round(otpTtlMs() / 60_000));

  try {
    await sendOtpCodeEmail({
      to: email,
      code,
      expiresInMinutes: ttlMin,
      firstName,
      purposeLabel: purposeLabel(purpose),
    });
  } catch (e) {
    logger.error(
      e instanceof AppError ? { err: e, errorCode: e.code } : { err: e },
      "Failed to send OTP email"
    );
    throw e;
  }
}

export async function verifyOtp(params: {
  userId: string;
  code: string;
  purpose: EmailOtpPurpose;
}): Promise<void> {
  const { userId, code, purpose } = params;
  const challenge = await emailOtpRepository.findLatestActiveChallenge(userId, purpose);
  if (!challenge) {
    throw new OtpInvalidError();
  }
  if (challenge.expiresAt <= new Date()) {
    throw new OtpInvalidError();
  }
  if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw new OtpInvalidError();
  }
  const expectedHash = hashOtpCode(code.trim());
  if (!timingSafeEqualHex(challenge.codeHash, expectedHash)) {
    await emailOtpRepository.incrementChallengeAttempts(challenge.id);
    throw new OtpInvalidError();
  }
  await emailOtpRepository.consumeChallenge(challenge.id);
}
