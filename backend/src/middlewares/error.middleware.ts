import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { formatValidationMessage } from "../utils/validationMessage";
import { env } from "../config/env";
import { logger } from "../lib/logger";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: { message: string; code?: string; details?: unknown } = {
      message: err.message,
      code: err.code,
    };
    if (err.details !== undefined) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: formatValidationMessage(err),
      code: "VALIDATION_ERROR",
      details: err.flatten(),
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  const message = env.isProduction ? "Internal server error" : String(err);
  res.status(500).json({ message, code: "INTERNAL_ERROR" });
}
