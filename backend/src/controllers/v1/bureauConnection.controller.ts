import type { Request, Response, NextFunction } from "express";
import { ValidationAppError } from "../../lib/errors";
import {
  bureauConnectionAddressBodySchema,
  bureauConnectionConsentBodySchema,
  bureauConnectionIdParamSchema,
  bureauConnectionIdentityBodySchema,
  bureauConnectionKiqAnswersBodySchema,
  bureauConnectionStartBodySchema,
} from "../../lib/validation/bureauConnection.schemas";
import * as bureauConnectionService from "../../services/bureauConnection.service";

function clientIp(req: Request): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0]?.trim();
  }
  const xReal = req.headers["x-real-ip"];
  if (typeof xReal === "string" && xReal.length > 0) {
    return xReal.trim();
  }
  return req.socket.remoteAddress;
}

export async function postStart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = bureauConnectionStartBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationAppError(parsed.error);
    }
    const body = await bureauConnectionService.startConnection(req.auth!.sub, parsed.data);
    res.status(201).json(body);
  } catch (e) {
    next(e);
  }
}

export async function postIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = bureauConnectionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationAppError(params.error);
    }
    const parsed = bureauConnectionIdentityBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationAppError(parsed.error);
    }
    const body = await bureauConnectionService.submitIdentity(
      req.auth!.sub,
      params.data.connectionId,
      parsed.data
    );
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
}

export async function postAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = bureauConnectionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationAppError(params.error);
    }
    const parsed = bureauConnectionAddressBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationAppError(parsed.error);
    }
    const body = await bureauConnectionService.submitAddress(
      req.auth!.sub,
      params.data.connectionId,
      parsed.data
    );
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
}

export async function postConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = bureauConnectionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationAppError(params.error);
    }
    const parsed = bureauConnectionConsentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationAppError(parsed.error);
    }
    const body = await bureauConnectionService.submitConsent(
      req.auth!.sub,
      params.data.connectionId,
      parsed.data,
      clientIp(req)
    );
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
}

export async function postKiqAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = bureauConnectionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationAppError(params.error);
    }
    const parsed = bureauConnectionKiqAnswersBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationAppError(parsed.error);
    }
    const body = await bureauConnectionService.submitKiqAnswers(
      req.auth!.sub,
      params.data.connectionId,
      parsed.data,
      clientIp(req)
    );
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = bureauConnectionIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new ValidationAppError(params.error);
    }
    const body = await bureauConnectionService.getConnectionStatus(
      req.auth!.sub,
      params.data.connectionId,
      clientIp(req)
    );
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
}
