import "dotenv/config";
import { bool, cleanEnv, port, str } from "envalid";

const raw = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "test", "production", "staging"],
    default: "development",
  }),
  PORT: port({ default: 3000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str({ desc: "Signing secret for access JWTs" }),
  JWT_ACCESS_EXPIRES_IN: str({
    default: "15m",
    desc: "Access JWT TTL (jsonwebtoken expiresIn string)",
  }),
  REFRESH_TOKEN_EXPIRES_IN: str({
    default: "7d",
    desc: "Refresh token storage TTL (ms-compatible string)",
  }),
  LOG_LEVEL: str({
    choices: ["fatal", "error", "warn", "info", "debug", "trace", "silent"],
    default: "info",
  }),
  LOG_PRETTY: bool({ default: false }),
  EMAIL_PROVIDER: str({
    choices: ["resend", "console"],
    default: "console",
    desc: "console logs only; use resend in production",
  }),
  RESEND_API_KEY: str({ default: "" }),
  EMAIL_FROM: str({ default: "onboarding@resend.dev", desc: "Verified sender in Resend" }),
  FRONTEND_URL: str({
    default: "http://localhost:5173",
    desc: "Base URL for password reset links (no trailing path)",
  }),
  PUBLIC_API_URL: str({
    default: "",
    desc: "Public origin of this API for email assets (logo). Empty = http://localhost:PORT",
  }),
  OTP_CODE_SECRET: str({ desc: "Server secret for HMAC of email OTP codes" }),
  OTP_TTL_MS: str({ default: "10m", desc: "Email OTP validity (ms-compatible)" }),
  PASSWORD_RESET_TTL_MS: str({ default: "1h", desc: "Password reset link TTL (ms-compatible)" }),
});

const publicApiBase =
  raw.PUBLIC_API_URL.replace(/\/$/, "") || `http://localhost:${raw.PORT}`;

export const env = {
  nodeEnv: raw.NODE_ENV,
  isDevelopment: raw.isDevelopment,
  isProduction: raw.isProduction,
  isTest: raw.isTest,
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  jwtSecret: raw.JWT_SECRET,
  jwtAccessExpiresIn: raw.JWT_ACCESS_EXPIRES_IN,
  refreshTokenExpiresIn: raw.REFRESH_TOKEN_EXPIRES_IN,
  logLevel: raw.LOG_LEVEL,
  logPretty: raw.LOG_PRETTY,
  emailProvider: raw.EMAIL_PROVIDER,
  resendApiKey: raw.RESEND_API_KEY,
  emailFrom: raw.EMAIL_FROM,
  frontendUrl: raw.FRONTEND_URL,
  publicApiUrl: publicApiBase,
  otpCodeSecret: raw.OTP_CODE_SECRET,
  otpTtlMs: raw.OTP_TTL_MS,
  passwordResetTtlMs: raw.PASSWORD_RESET_TTL_MS,
};
