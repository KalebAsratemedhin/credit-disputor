import type { Request, Response, NextFunction } from "express";
import { logger } from "../../lib/logger";
import * as authService from "../../services/auth.service";

export async function postPhoneSendVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const reqId = "id" in req ? (req as Request & { id?: unknown }).id : undefined;
  const userId = req.auth?.sub;
  logger.info(
    { reqId, userId, path: req.path, method: req.method },
    "phone.send-verification: handler entered"
  );
  try {
    const result = await authService.sendPhoneVerificationForUser(req.auth!.sub);
    logger.info({ reqId, userId }, "phone.send-verification: success, responding 200");
    res.status(200).json(result);
  } catch (e) {
    logger.warn(
      { reqId, userId, err: e instanceof Error ? e.message : e },
      "phone.send-verification: handler error, passing to error middleware"
    );
    next(e);
  }
}

export async function postPhoneVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
  const reqId = "id" in req ? (req as Request & { id?: unknown }).id : undefined;
  const userId = req.auth?.sub;
  logger.info(
    { reqId, userId, path: req.path, method: req.method, bodyKeys: Object.keys(req.body ?? {}) },
    "phone.verify: handler entered"
  );
  try {
    const result = await authService.verifyPhoneForUser(req.auth!.sub, req.body);
    logger.info({ reqId, userId }, "phone.verify: success, responding 200");
    res.status(200).json(result);
  } catch (e) {
    logger.warn(
      { reqId, userId, err: e instanceof Error ? e.message : e },
      "phone.verify: handler error, passing to error middleware"
    );
    next(e);
  }
}
