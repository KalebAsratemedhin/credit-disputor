/** Parse PII_ENCRYPTION_KEY (64 hex chars = 32 bytes for AES-256-GCM). */
export function parsePiiEncryptionKey(hex: string): Buffer {
  const cleaned = hex.replace(/\s/g, "");
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error("PII_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).");
  }
  return Buffer.from(cleaned, "hex");
}
