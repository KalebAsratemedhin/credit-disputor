import type { Request, Response, NextFunction } from "express";
import * as preferencesService from "../../services/preferences.service";

export async function getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = await preferencesService.getPreferencesResponse(req.auth!.sub);
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
}

export async function patchPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = await preferencesService.patchPreferences(req.auth!.sub, req.body);
    res.status(200).json(body);
  } catch (e) {
    next(e);
  }
}
