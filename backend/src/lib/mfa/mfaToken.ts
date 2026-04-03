import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { MfaTokenInvalidError } from "../errors";
import { AppError } from "../utils/errors";

export const MFA_JWT_TYP = "mfa_pending" as const;

export function signMfaToken(userId: string, email: string): string {
  const options = { expiresIn: env.jwtMfaExpiresIn } as SignOptions;
  return jwt.sign({ sub: userId, email, typ: MFA_JWT_TYP }, env.jwtSecret, options);
}

export function verifyMfaToken(raw: string): { userId: string; email: string } {
  try {
    const payload = jwt.verify(raw, env.jwtSecret);
    if (typeof payload === "string" || !payload.sub || typeof payload.sub !== "string") {
      throw new MfaTokenInvalidError();
    }
    const userId = payload.sub;
    const p = payload as JwtPayload & { typ?: string; email?: string };
    if (p.typ !== MFA_JWT_TYP) {
      throw new MfaTokenInvalidError();
    }
    if (!p.email || typeof p.email !== "string") {
      throw new MfaTokenInvalidError();
    }
    return { userId, email: p.email };
  } catch (e) {
    if (e instanceof AppError) {
      throw e;
    }
    throw new MfaTokenInvalidError();
  }
}
