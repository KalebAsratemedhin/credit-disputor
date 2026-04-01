import type { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { formatValidationMessage } from "../utils/validationMessage";

export class ValidationAppError extends AppError {
  constructor(zodError: ZodError) {
    super(formatValidationMessage(zodError), 400, "VALIDATION_ERROR", zodError.flatten());
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

export type EmailDeliveryDetails = {
  provider: "resend";
  reason?: string;
};

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
