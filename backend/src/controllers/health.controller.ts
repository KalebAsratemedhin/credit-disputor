import type { Request, Response, NextFunction } from "express";
import * as healthService from "../services/health.service";
import { AppError } from "../lib/utils/errors";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  res.json({ status: "ok" });
}

export async function getHealthDb(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await healthService.checkDatabase();
    res.json({ status: "ok", database: "connected" });
  } catch {
    next(new AppError("Database unavailable", 503, "DB_UNAVAILABLE"));
  }
}
