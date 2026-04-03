import crypto from "crypto";
import {
  AES_256_GCM_ALGORITHM,
  AES_GCM_AUTH_TAG_LENGTH,
  AES_GCM_IV_LENGTH,
} from "../constants";

export function encryptUtf8(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(AES_GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_256_GCM_ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptUtf8(ciphertextB64: string, key: Buffer): string {
  const buf = Buffer.from(ciphertextB64, "base64");
  if (buf.length < AES_GCM_IV_LENGTH + AES_GCM_AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, AES_GCM_IV_LENGTH);
  const tag = buf.subarray(
    AES_GCM_IV_LENGTH,
    AES_GCM_IV_LENGTH + AES_GCM_AUTH_TAG_LENGTH
  );
  const enc = buf.subarray(AES_GCM_IV_LENGTH + AES_GCM_AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(AES_256_GCM_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function parseTotpEncryptionKey(hex: string): Buffer {
  const cleaned = hex.replace(/\s/g, "");
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error("TOTP_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).");
  }
  return Buffer.from(cleaned, "hex");
}
