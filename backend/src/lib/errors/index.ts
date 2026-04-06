import type { ZodError } from "zod";
import type { EmailDeliveryDetails } from "../types/email";
import { AppError } from "../utils/errors";
import { formatValidationMessage } from "../utils/validationMessage";

export type { EmailDeliveryDetails };

export * from "./bureau.errors";
export * from "./experian.errors";

export class ValidationAppError extends AppError {
  constructor(zodError: ZodError) {
    super(
      formatValidationMessage(zodError),
      400,
      "VALIDATION_ERROR",
      zodError.flatten(),
      true
    );
  }
}

export class EmailTakenError extends AppError {
  constructor() {
    super("An account with this email already exists.", 409, "EMAIL_TAKEN");
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found.`, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = "Invalid or expired token.") {
    super(message, 401, "INVALID_TOKEN");
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super("Invalid or expired refresh token.", 401, "INVALID_REFRESH_TOKEN");
  }
}

export class OtpInvalidError extends AppError {
  constructor() {
    super("Invalid or expired verification code.", 400, "OTP_INVALID");
  }
}

export class ResetTokenInvalidError extends AppError {
  constructor() {
    super("Invalid or expired password reset link.", 400, "RESET_TOKEN_INVALID");
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super("Please verify your email before signing in.", 403, "EMAIL_NOT_VERIFIED");
  }
}

export class EmailConfigurationError extends AppError {
  constructor() {
    super("Email is not configured correctly on the server.", 500, "EMAIL_NOT_CONFIGURED");
  }
}

export class EmailDeliveryError extends AppError {
  constructor(details?: EmailDeliveryDetails) {
    super(
      "We could not send the email. Please try again later.",
      503,
      "EMAIL_DELIVERY_FAILED",
      details
    );
  }
}

export class GoogleSignInNotConfiguredError extends AppError {
  constructor() {
    super("Google sign-in is not configured on this server.", 503, "GOOGLE_SIGNIN_NOT_CONFIGURED");
  }
}

export class InvalidGoogleIdTokenError extends AppError {
  constructor() {
    super("Invalid or unverified Google credential.", 401, "INVALID_GOOGLE_ID_TOKEN");
  }
}

export class GoogleAccountConflictError extends AppError {
  constructor() {
    super(
      "This email is already linked to a different Google account.",
      409,
      "GOOGLE_ACCOUNT_CONFLICT"
    );
  }
}

export class CurrentPasswordIncorrectError extends AppError {
  constructor() {
    super("Current password is incorrect.", 401, "CURRENT_PASSWORD_INCORRECT");
  }
}

export class CurrentPasswordRequiredError extends AppError {
  constructor() {
    super("Current password is required.", 400, "CURRENT_PASSWORD_REQUIRED");
  }
}

export class TotpAlreadyEnabledError extends AppError {
  constructor() {
    super("Authenticator is already enabled. Remove it before enrolling again.", 409, "TOTP_ALREADY_ENABLED");
  }
}

export class TotpNotConfiguredError extends AppError {
  constructor() {
    super("Authenticator is not set up.", 400, "TOTP_NOT_CONFIGURED");
  }
}

export class InvalidTotpCodeError extends AppError {
  constructor() {
    super("Invalid authenticator code.", 400, "INVALID_TOTP_CODE");
  }
}

export class WebAuthnVerificationError extends AppError {
  constructor(message = "Security key registration failed.") {
    super(message, 400, "WEBAUTHN_VERIFICATION_FAILED");
  }
}

export class WebAuthnChallengeError extends AppError {
  constructor(
    message = "Security key challenge expired or missing. Start registration again."
  ) {
    super(message, 400, "WEBAUTHN_CHALLENGE_INVALID");
  }
}

export class WebAuthnNotAvailableError extends AppError {
  constructor() {
    super("No passkeys are registered for this account.", 400, "WEBAUTHN_NOT_AVAILABLE");
  }
}

export class InvalidAvatarTypeError extends AppError {
  constructor(reportedMimeType: string) {
    super(
      `Invalid image type (${reportedMimeType}). Allowed types: JPEG, PNG, WebP.`,
      400,
      "INVALID_AVATAR_TYPE"
    );
  }
}

export class AvatarRequiredError extends AppError {
  constructor() {
    super("Avatar image file is required (field name: avatar).", 400, "AVATAR_REQUIRED");
  }
}

export class MfaTokenInvalidError extends AppError {
  constructor() {
    super("Invalid or expired sign-in verification token.", 401, "MFA_TOKEN_INVALID");
  }
}

export class NoBackupCodesError extends AppError {
  constructor() {
    super("No backup codes are available for this account.", 400, "NO_BACKUP_CODES");
  }
}

export class InvalidMfaBackupCodeError extends AppError {
  constructor() {
    super("Invalid backup code.", 400, "INVALID_MFA_BACKUP_CODE");
  }
}

export class InvalidPhoneNumberError extends AppError {
  constructor() {
    super("Invalid phone number. Use a valid number in international format (e.g. +1…).", 400, "INVALID_PHONE_NUMBER");
  }
}

export class PhoneVerificationFailedError extends AppError {
  constructor() {
    super("Invalid or expired phone verification code.", 400, "PHONE_VERIFICATION_FAILED");
  }
}

export class TwilioVerifyNotConfiguredError extends AppError {
  constructor() {
    super("SMS verification is not configured on this server.", 503, "TWILIO_VERIFY_NOT_CONFIGURED");
  }
}

export class PhoneVerificationSendError extends AppError {
  constructor() {
    super("Could not send SMS verification. Try again later.", 503, "PHONE_VERIFICATION_SEND_FAILED");
  }
}
