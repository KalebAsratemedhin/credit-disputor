import "dotenv/config";
import { bool, cleanEnv, num, port, str } from "envalid";

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
  JWT_MFA_EXPIRES_IN: str({
    default: "10m",
    desc: "Step-up MFA JWT TTL after password sign-in (jsonwebtoken expiresIn string)",
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
  GOOGLE_CLIENT_ID: str({
    default: "",
    desc: "Google OAuth client ID(s) for Sign in with Google; comma-separated if multiple",
  }),
  TOTP_ENCRYPTION_KEY: str({
    desc: "64 hex chars (32 bytes) for AES-256-GCM encryption of TOTP secrets at rest",
  }),
  PII_ENCRYPTION_KEY: str({
    desc: "64 hex chars (32 bytes) for AES-256-GCM encryption of bureau PII blobs at rest",
  }),
  WEBAUTHN_RP_ID: str({
    default: "localhost",
    desc: "WebAuthn relying party ID (hostname only, e.g. localhost or app.example.com)",
  }),
  WEBAUTHN_RP_NAME: str({ default: "Credit Disputor", desc: "WebAuthn RP display name" }),
  WEBAUTHN_ORIGIN: str({
    default: "http://localhost:5173",
    desc: "Allowed WebAuthn origin(s); comma-separated (e.g. SPA URL)",
  }),
  TWILIO_VERIFY_PROVIDER: str({
    choices: ["twilio", "console"],
    default: "console",
    desc: "console logs SMS; twilio uses Verify API",
  }),
  TWILIO_ACCOUNT_SID: str({ default: "" }),
  TWILIO_AUTH_TOKEN: str({ default: "" }),
  TWILIO_VERIFY_SERVICE_SID: str({ default: "", desc: "Verify v2 Service SID (VA…)" }),
  TWILIO_PHONE_DEFAULT_REGION: str({
    default: "US",
    desc: "Default country for parsing national phone numbers at signup/profile",
  }),
  EXPERIAN_MOCK: bool({
    default: false,
    desc: "If true, skip real Experian HTTP; use fixed mock scores/tokens in experianConnect.service",
  }),
  EXPERIAN_CLIENT_ID: str({ default: "" }),
  EXPERIAN_CLIENT_SECRET: str({ default: "" }),
  EXPERIAN_USERNAME: str({ default: "" }),
  EXPERIAN_PASSWORD: str({ default: "" }),
  EXPERIAN_TOKEN_URL: str({
    default: "https://sandbox-us-api.experian.com/oauth2/v1/token",
    desc: "OAuth2 token endpoint (sandbox or production US)",
  }),
  EXPERIAN_CONNECT_BASE_URL: str({
    default: "https://sandbox-us-api.experian.com/connectapi",
    desc: "Connect API base including /connectapi path",
  }),
  EXPERIAN_CONNECT_PRODUCT_ID: str({
    default: "38",
    desc: "Connect /v3/report productId (see Experian Connect swagger enum)",
  }),
  EXPERIAN_CONNECT_PURPOSE_TYPE: str({
    default: "7",
    desc: "FCRA purposeType string per Connect API (e.g. 7 = evaluating financial status)",
  }),
  EXPERIAN_CONNECT_RISK_MODEL: str({
    choices: ["VP", "VQ"],
    default: "VP",
    desc: "VP = Vantage 3, VQ = Vantage 4",
  }),
  EXPERIAN_HTTP_TIMEOUT_MS: num({ default: 30_000 }),
});

const publicApiBase =
  raw.PUBLIC_API_URL.replace(/\/$/, "") || `http://localhost:${raw.PORT}`;

const googleClientIds = raw.GOOGLE_CLIENT_ID.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const webAuthnOrigins = raw.WEBAUTHN_ORIGIN.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: raw.NODE_ENV,
  isDevelopment: raw.isDevelopment,
  isProduction: raw.isProduction,
  isTest: raw.isTest,
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  jwtSecret: raw.JWT_SECRET,
  jwtAccessExpiresIn: raw.JWT_ACCESS_EXPIRES_IN,
  jwtMfaExpiresIn: raw.JWT_MFA_EXPIRES_IN,
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
  googleClientIds,
  totpEncryptionKeyHex: raw.TOTP_ENCRYPTION_KEY,
  piiEncryptionKeyHex: raw.PII_ENCRYPTION_KEY,
  webauthnRpId: raw.WEBAUTHN_RP_ID,
  webauthnRpName: raw.WEBAUTHN_RP_NAME,
  webauthnOrigins: webAuthnOrigins,
  twilioVerifyProvider: raw.TWILIO_VERIFY_PROVIDER as "twilio" | "console",
  twilioAccountSid: raw.TWILIO_ACCOUNT_SID,
  twilioAuthToken: raw.TWILIO_AUTH_TOKEN,
  twilioVerifyServiceSid: raw.TWILIO_VERIFY_SERVICE_SID,
  twilioPhoneDefaultRegion: raw.TWILIO_PHONE_DEFAULT_REGION,
  experianMock: raw.EXPERIAN_MOCK,
  experianClientId: raw.EXPERIAN_CLIENT_ID,
  experianClientSecret: raw.EXPERIAN_CLIENT_SECRET,
  experianUsername: raw.EXPERIAN_USERNAME,
  experianPassword: raw.EXPERIAN_PASSWORD,
  experianTokenUrl: raw.EXPERIAN_TOKEN_URL,
  experianConnectBaseUrl: raw.EXPERIAN_CONNECT_BASE_URL,
  experianConnectProductId: raw.EXPERIAN_CONNECT_PRODUCT_ID,
  experianConnectPurposeType: raw.EXPERIAN_CONNECT_PURPOSE_TYPE,
  experianConnectRiskModel: raw.EXPERIAN_CONNECT_RISK_MODEL as "VP" | "VQ",
  experianHttpTimeoutMs: raw.EXPERIAN_HTTP_TIMEOUT_MS,
};
