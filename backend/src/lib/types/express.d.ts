import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload & { sub: string };
      /** Set by `requireMfaToken` after password sign-in, before MFA verify. */
      mfaPending?: { userId: string; email: string };
    }
  }
}

export {};
