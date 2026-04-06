import path from "path";

export const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const AVATAR_UPLOAD_SUBDIR = "avatars";

export const AUTH_OPAQUE_TOKEN_BYTES = 32;
export const BACKUP_CODE_BATCH_ID_BYTES = 16;
/** Decimal digits per backup code (zero-padded, e.g. 00000000–99999999). */
export const BACKUP_CODE_DIGITS = 8;
export const BACKUP_CODE_NUMERIC_EXCLUSIVE_MAX = 10 ** BACKUP_CODE_DIGITS;
export const AVATAR_FILENAME_RANDOM_BYTES = 8;

export const MS_PER_MINUTE = 60_000;

export const OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_DIGIT_COUNT = 4;
export const EMAIL_OTP_RANDOM_EXCLUSIVE_MAX = 10 ** EMAIL_OTP_DIGIT_COUNT;

export const BCRYPT_COST = 12;

/** Minimum length for signup, reset-password, and change-password fields. */
export const PASSWORD_MIN_LENGTH = 8;

/** Accepted SMS code when `TWILIO_VERIFY_PROVIDER=console` (local dev). */
export const TWILIO_VERIFY_CONSOLE_APPROVED_CODE = "000000";

/** Bounds for Twilio Verify SMS code input validation (digits only). */
export const PHONE_VERIFICATION_CODE_MIN_LENGTH = 4;
export const PHONE_VERIFICATION_CODE_MAX_LENGTH = 16;

export const RATE_LIMIT_WINDOW_MS = {
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
} as const;

export const RATE_LIMIT_MAX_REQUESTS = {
  CHANGE_PASSWORD: 10,
  SECURITY_MUTATE: 40,
  TOTP_VERIFY: 25,
  GOOGLE_SIGN_IN: 30,
  VERIFY_OTP: 30,
  RESEND_OTP: 15,
  PHONE_VERIFY_SEND: 15,
  PHONE_VERIFY_CHECK: 30,
  SIGNIN_MFA_SEND: 15,
  SIGNIN_MFA_VERIFY: 30,
  SIGNIN_MFA_WEBAUTHN_OPTIONS: 30,
  FORGOT_PASSWORD: 8,
  RESET_PASSWORD: 20,
  BUREAU_CONNECTION_PII: 30,
} as const;

export const AES_256_GCM_ALGORITHM = "aes-256-gcm";
export const AES_GCM_IV_LENGTH = 16;
export const AES_GCM_AUTH_TAG_LENGTH = 16;

export const EMAIL_PRIMARY_COLOR = "#0093FF";

export const VALIDATION_MESSAGE_MAX_FIELD_NAMES = 4;

export const FORGOT_PASSWORD_ACK =
  "If an account exists for that email, you will receive password reset instructions shortly.";
export const RESET_PASSWORD_SUCCESS_MESSAGE =
  "Password has been reset. You can sign in with your new password.";

export const WEBAUTHN_REGISTRATION_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const BACKUP_CODE_COUNT = 6;
