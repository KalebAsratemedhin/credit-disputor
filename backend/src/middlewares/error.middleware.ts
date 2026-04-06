import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../lib/utils/errors";
import { formatValidationMessage } from "../lib/utils/validationMessage";
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
    const exposeDetails =
      err.details !== undefined &&
      (env.isDevelopment || err.exposeDetailsToClient === true);
    if (exposeDetails) {
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

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "File too large.", code: "FILE_TOO_LARGE" });
      return;
    }
    res.status(400).json({ message: err.message, code: "UPLOAD_ERROR" });
    return;
  }

  logger.error({ err }, "Unhandled error");
  const message = env.isProduction ? "Internal server error" : String(err);
  res.status(500).json({ message, code: "INTERNAL_ERROR" });
}
