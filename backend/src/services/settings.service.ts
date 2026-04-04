import crypto from "crypto";
import bcrypt from "bcrypt";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { authenticator } from "otplib";
import { env } from "../config/env";
import {
  BACKUP_CODE_BATCH_ID_BYTES,
  BACKUP_CODE_COUNT,
  BACKUP_CODE_DIGITS,
  BACKUP_CODE_NUMERIC_EXCLUSIVE_MAX,
  BCRYPT_COST,
  WEBAUTHN_REGISTRATION_CHALLENGE_TTL_MS,
} from "../lib/constants";
import { encryptUtf8, decryptUtf8, parseTotpEncryptionKey } from "../lib/crypto/aes256gcm";
import {
  CurrentPasswordIncorrectError,
  CurrentPasswordRequiredError,
  InvalidPhoneNumberError,
  InvalidTotpCodeError,
  NotFoundError,
  TotpAlreadyEnabledError,
  TotpNotConfiguredError,
  ValidationAppError,
  WebAuthnChallengeError,
  WebAuthnVerificationError,
} from "../lib/errors";
import type { PublicUser } from "../lib/types/user";
import * as backupCodeRepository from "../repositories/backupCode.repository";
import * as refreshTokenRepository from "../repositories/refreshToken.repository";
import * as totpRepository from "../repositories/totp.repository";
import * as userRepository from "../repositories/user.repository";
import * as webauthnRepository from "../repositories/webauthn.repository";
import { toE164 } from "../lib/phone";
import { logger } from "../lib/logger";
import {
  changePasswordBodySchema,
  patchProfileBodySchema,
} from "../lib/validation/settings.schemas";
import * as twilioVerifyService from "./twilioVerify.service";

let totpKeyCache: Buffer | null = null;

function getTotpKey(): Buffer {
  if (!totpKeyCache) {
    totpKeyCache = parseTotpEncryptionKey(env.totpEncryptionKeyHex);
  }

  return totpKeyCache;
}

function generateBackupCodeStrings(): string[] {
  const codes: string[] = [];
  const seen = new Set<string>();

  while (codes.length < BACKUP_CODE_COUNT) {
    const n = crypto.randomInt(0, BACKUP_CODE_NUMERIC_EXCLUSIVE_MAX);
    const c = n.toString().padStart(BACKUP_CODE_DIGITS, "0");
    if (seen.has(c)) {
      continue;
    }
    seen.add(c);
    codes.push(c);
  }

  return codes;
}

async function persistBackupCodes(userId: string, plainCodes: string[]): Promise<void> {
  const batchId = crypto.randomBytes(BACKUP_CODE_BATCH_ID_BYTES).toString("hex");
  const codeHashes: string[] = [];

  for (const c of plainCodes) {
    codeHashes.push(await bcrypt.hash(c, BCRYPT_COST));
  }

  await backupCodeRepository.replaceBackupCodesForUser(userId, batchId, codeHashes);
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }

  return user;
}

export async function patchProfile(userId: string, rawBody: unknown): Promise<PublicUser> {
  const parsed = patchProfileBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }

  const { fullName, phoneNumber } = parsed.data;

  const before = await userRepository.findUserRecordById(userId);
  if (!before) {
    throw new NotFoundError("User");
  }

  let normalizedPhone: string | null | undefined;
  if (phoneNumber !== undefined) {
    if (phoneNumber === null) {
      normalizedPhone = null;
    } else {
      const e164 = toE164(phoneNumber);
      if (!e164) {
        throw new InvalidPhoneNumberError();
      }
      normalizedPhone = e164;
    }
  }

  const user = await userRepository.updateProfile(userId, {
    fullName,
    phoneNumber: normalizedPhone === undefined ? undefined : normalizedPhone,
  });

  if (
    normalizedPhone !== undefined &&
    normalizedPhone !== null &&
    before.phoneNumber !== user.phoneNumber
  ) {
    try {
      await twilioVerifyService.startPhoneVerification(normalizedPhone);
    } catch (e) {
      logger.error(
        e instanceof Error ? { err: e.message } : { err: e },
        "Failed to send phone verification SMS after profile update"
      );
    }
  }

  return user;
}

export async function setAvatarUrl(userId: string, avatarUrl: string | null): Promise<PublicUser> {
  return userRepository.updateAvatarUrl(userId, avatarUrl);
}

export async function changePassword(userId: string, rawBody: unknown): Promise<{ ok: true }> {
  const parsed = changePasswordBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationAppError(parsed.error);
  }

  const { currentPassword, newPassword } = parsed.data;
  const user = await userRepository.findUserRecordById(userId);
  if (!user) {
    throw new CurrentPasswordIncorrectError();
  }

  if (user.passwordHash !== null) {
    if (currentPassword === undefined || currentPassword === "") {
      throw new CurrentPasswordRequiredError();
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new CurrentPasswordIncorrectError();
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await userRepository.updatePasswordHash(userId, passwordHash);
  await refreshTokenRepository.deleteRefreshTokensForUser(userId);

  return { ok: true };
}

export async function getSecurityStatus(userId: string): Promise<{
  totpEnabled: boolean;
  backupCodesRemaining: number;
  webauthnCredentialCount: number;
}> {
  const totp = await totpRepository.findUserTotpByUserId(userId);
  const backupCodesRemaining = await backupCodeRepository.countUnusedBackupCodes(userId);
  const webauthnCredentialCount = await webauthnRepository.countWebauthnCredentials(userId);

  return {
    totpEnabled: totp?.enabled ?? false,
    backupCodesRemaining,
    webauthnCredentialCount,
  };
}

export async function beginTotpSetup(
  userId: string,
  email: string
): Promise<{ otpauthUrl: string; secretBase32: string }> {
  const existing = await totpRepository.findUserTotpByUserId(userId);
  if (existing?.enabled) {
    throw new TotpAlreadyEnabledError();
  }

  const secret = authenticator.generateSecret();
  const secretEnc = encryptUtf8(secret, getTotpKey());

  await totpRepository.upsertPendingUserTotp(userId, secretEnc);

  const issuer = env.webauthnRpName.replace(/:/g, "");
  const otpauthUrl = authenticator.keyuri(email, issuer, secret);

  return { otpauthUrl, secretBase32: secret };
}

export async function verifyTotpAndEnable(
  userId: string,
  code: string
): Promise<{ backupCodes: string[] }> {
  const row = await totpRepository.findUserTotpByUserId(userId);
  if (!row) {
    throw new TotpNotConfiguredError();
  }

  let secret: string;
  try {
    secret = decryptUtf8(row.secretEnc, getTotpKey());
  } catch {
    throw new TotpNotConfiguredError();
  }

  const ok = authenticator.verify({ token: code, secret });
  if (!ok) {
    throw new InvalidTotpCodeError();
  }

  await totpRepository.markUserTotpEnabled(userId);

  const backupCodes = generateBackupCodeStrings();
  await persistBackupCodes(userId, backupCodes);

  return { backupCodes };
}

export async function disableTotp(userId: string): Promise<void> {
  await backupCodeRepository.deleteBackupCodesForUser(userId);
  await totpRepository.deleteUserTotpForUser(userId);
}

export async function regenerateBackupCodes(userId: string): Promise<{ backupCodes: string[] }> {
  const row = await totpRepository.findUserTotpByUserId(userId);
  if (!row?.enabled) {
    throw new TotpNotConfiguredError();
  }

  const backupCodes = generateBackupCodeStrings();
  await persistBackupCodes(userId, backupCodes);

  return { backupCodes };
}

export async function webauthnRegistrationOptions(userId: string) {
  const user = await userRepository.findUserRecordById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }

  await webauthnRepository.deleteRegistrationChallengesForUser(userId);

  const existing = await webauthnRepository.listWebauthnCredentialsForExclude(userId);
  const excludeCredentials = existing.map((e) => ({
    id: e.credentialId,
    transports: e.transports
      ? (JSON.parse(e.transports) as AuthenticatorTransportFuture[])
      : undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName: env.webauthnRpName,
    rpID: env.webauthnRpId,
    userName: user.email,
    userDisplayName: user.fullName,
    userID: Buffer.from(user.id, "utf8"),
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const expiresAt = new Date(Date.now() + WEBAUTHN_REGISTRATION_CHALLENGE_TTL_MS);
  await webauthnRepository.createRegistrationChallenge({
    userId,
    challenge: options.challenge,
    expiresAt,
  });

  return options;
}

export async function webauthnRegistrationVerify(
  userId: string,
  nickname: string,
  response: RegistrationResponseJSON
): Promise<void> {
  const challengeRow = await webauthnRepository.findLatestRegistrationChallenge(userId);
  if (!challengeRow) {
    throw new WebAuthnChallengeError();
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: env.webauthnOrigins,
      expectedRPID: env.webauthnRpId,
    });
  } catch {
    throw new WebAuthnVerificationError();
  }

  await webauthnRepository.deleteWebauthnChallengeById(challengeRow.id);

  if (!verification.verified || !verification.registrationInfo) {
    throw new WebAuthnVerificationError();
  }

  const { credential } = verification.registrationInfo;
  const publicKey = Buffer.from(credential.publicKey);
  const transports =
    credential.transports && credential.transports.length > 0
      ? JSON.stringify(credential.transports)
      : null;

  await webauthnRepository.insertWebauthnCredential({
    userId,
    credentialId: credential.id,
    publicKey,
    counter: BigInt(credential.counter),
    transports,
    nickname,
  });
}

export async function listWebauthnCredentials(userId: string) {
  return webauthnRepository.listWebauthnCredentialsForDisplay(userId);
}

export async function removeWebauthnCredential(userId: string, credentialRowId: string): Promise<boolean> {
  const count = await webauthnRepository.deleteWebauthnCredential(userId, credentialRowId);

  return count > 0;
}
