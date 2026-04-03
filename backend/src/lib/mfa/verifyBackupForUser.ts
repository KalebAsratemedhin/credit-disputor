import bcrypt from "bcrypt";
import { BACKUP_CODE_DIGITS } from "../constants";
import { InvalidMfaBackupCodeError, NoBackupCodesError } from "../errors";
import * as backupCodeRepository from "../../repositories/backupCode.repository";

function normalizeBackupCodeDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function verifyAndConsumeBackupCodeForUser(userId: string, rawCode: string): Promise<void> {
  const unusedCount = await backupCodeRepository.countUnusedBackupCodes(userId);
  if (unusedCount === 0) {
    throw new NoBackupCodesError();
  }

  const digits = normalizeBackupCodeDigits(rawCode);
  if (digits.length !== BACKUP_CODE_DIGITS) {
    throw new InvalidMfaBackupCodeError();
  }

  const rows = await backupCodeRepository.listUnusedBackupCodeRows(userId);
  for (const row of rows) {
    const match = await bcrypt.compare(digits, row.codeHash);
    if (match) {
      const updated = await backupCodeRepository.markBackupCodeUsedById(userId, row.id);
      if (updated) {
        return;
      }
    }
  }

  throw new InvalidMfaBackupCodeError();
}
