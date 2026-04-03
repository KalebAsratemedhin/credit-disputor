import { authenticator } from "otplib";
import { env } from "../../config/env";
import { decryptUtf8, parseTotpEncryptionKey } from "../crypto/aes256gcm";
import { InvalidTotpCodeError, TotpNotConfiguredError } from "../errors";
import * as totpRepository from "../../repositories/totp.repository";

let totpKeyCache: Buffer | null = null;

function getTotpKey(): Buffer {
  if (!totpKeyCache) {
    totpKeyCache = parseTotpEncryptionKey(env.totpEncryptionKeyHex);
  }
  return totpKeyCache;
}

export async function verifyTotpCodeForUser(userId: string, code: string): Promise<void> {
  const row = await totpRepository.findUserTotpByUserId(userId);
  if (!row?.enabled) {
    throw new TotpNotConfiguredError();
  }

  let secret: string;
  try {
    secret = decryptUtf8(row.secretEnc, getTotpKey());
  } catch {
    throw new TotpNotConfiguredError();
  }

  const ok = authenticator.verify({ token: code.trim(), secret });
  if (!ok) {
    throw new InvalidTotpCodeError();
  }
}
