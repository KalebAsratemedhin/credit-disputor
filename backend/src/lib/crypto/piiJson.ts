import { decryptUtf8, encryptUtf8 } from "./aes256gcm";

export function encryptJsonValue(value: unknown, key: Buffer): string {
  const json = JSON.stringify(value);
  return encryptUtf8(json, key);
}

export function decryptJsonValue<T>(ciphertextB64: string, key: Buffer): T {
  const json = decryptUtf8(ciphertextB64, key);
  return JSON.parse(json) as T;
}
