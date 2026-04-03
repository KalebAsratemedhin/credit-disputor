import rateLimit from "express-rate-limit";
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "../lib/constants";

export const changePasswordLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.ONE_HOUR,
  max: RATE_LIMIT_MAX_REQUESTS.CHANGE_PASSWORD,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password change attempts. Try again later.", code: "RATE_LIMITED" },
});

export const securityMutateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.FIFTEEN_MINUTES,
  max: RATE_LIMIT_MAX_REQUESTS.SECURITY_MUTATE,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Try again later.", code: "RATE_LIMITED" },
});

export const totpVerifyLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.FIFTEEN_MINUTES,
  max: RATE_LIMIT_MAX_REQUESTS.TOTP_VERIFY,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts. Try again later.", code: "RATE_LIMITED" },
});

export const googleSignInLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.FIFTEEN_MINUTES,
  max: RATE_LIMIT_MAX_REQUESTS.GOOGLE_SIGN_IN,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many Google sign-in attempts. Try again later.", code: "RATE_LIMITED" },
});

export const verifyOtpLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.FIFTEEN_MINUTES,
  max: RATE_LIMIT_MAX_REQUESTS.VERIFY_OTP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again later.", code: "RATE_LIMITED" },
});

export const resendOtpLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.FIFTEEN_MINUTES,
  max: RATE_LIMIT_MAX_REQUESTS.RESEND_OTP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many resend requests. Try again later.", code: "RATE_LIMITED" },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.ONE_HOUR,
  max: RATE_LIMIT_MAX_REQUESTS.FORGOT_PASSWORD,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Try again later.", code: "RATE_LIMITED" },
});

export const resetPasswordLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS.FIFTEEN_MINUTES,
  max: RATE_LIMIT_MAX_REQUESTS.RESET_PASSWORD,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again later.", code: "RATE_LIMITED" },
});
