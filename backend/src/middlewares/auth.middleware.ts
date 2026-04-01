import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { InvalidTokenError, UnauthorizedError } from "../lib/errors";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError());
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    next(new UnauthorizedError());
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === "string" || !payload.sub || typeof payload.sub !== "string") {
      next(new InvalidTokenError());
      return;
    }
    req.auth = payload as jwt.JwtPayload & { sub: string };
    next();
  } catch {
    next(new InvalidTokenError());
  }
}
