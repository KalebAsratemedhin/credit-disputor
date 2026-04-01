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
});

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
};
