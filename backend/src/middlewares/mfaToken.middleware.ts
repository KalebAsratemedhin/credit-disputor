import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../lib/errors";
import { verifyMfaToken } from "../lib/mfa/mfaToken";

export function requireMfaToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Sign-in verification token required."));
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    next(new UnauthorizedError("Sign-in verification token required."));
    return;
  }
  try {
    req.mfaPending = verifyMfaToken(token);
    next();
  } catch (e) {
    next(e);
  }
}
