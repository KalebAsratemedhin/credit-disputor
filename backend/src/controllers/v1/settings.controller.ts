import type { Request, Response, NextFunction } from "express";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { env } from "../../config/env";
import { AvatarRequiredError, ValidationAppError } from "../../lib/errors";
import { AVATAR_UPLOAD_SUBDIR } from "../../lib/constants";
import { publicUploadPath } from "../../lib/upload/multerFactory";
import * as settingsService from "../../services/settings.service";
import {
  totpVerifyBodySchema,
  webauthnRegisterVerifyBodySchema,
} from "../../lib/validation/settings.schemas";

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await settingsService.getProfile(req.auth!.sub);

    res.status(200).json({ user });
  } catch (e) {
    next(e);
  }
}

export async function patchMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await settingsService.patchProfile(req.auth!.sub, req.body);

    res.status(200).json({ user });
  } catch (e) {
    next(e);
  }
}

export async function postMePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await settingsService.changePassword(req.auth!.sub, req.body);

    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postMeAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new AvatarRequiredError();
    }

    const relative = publicUploadPath(AVATAR_UPLOAD_SUBDIR, req.file.filename);
    const avatarUrl = `${env.publicApiUrl}${relative}`;
    const user = await settingsService.setAvatarUrl(req.auth!.sub, avatarUrl);

    res.status(200).json({ user, avatarUrl });
  } catch (e) {
    next(e);
  }
}

export async function getSecurityStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await settingsService.getSecurityStatus(req.auth!.sub);

    res.status(200).json(status);
  } catch (e) {
    next(e);
  }
}

export async function postTotpSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await settingsService.getProfile(req.auth!.sub);
    const result = await settingsService.beginTotpSetup(user.id, user.email);

    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postTotpVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = totpVerifyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationAppError(parsed.error);
    }

    const result = await settingsService.verifyTotpAndEnable(req.auth!.sub, parsed.data.code);

    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function deleteTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await settingsService.disableTotp(req.auth!.sub);

    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function postBackupCodesRegenerate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await settingsService.regenerateBackupCodes(req.auth!.sub);

    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function postWebauthnRegisterOptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const options = await settingsService.webauthnRegistrationOptions(req.auth!.sub);

    res.status(200).json(options);
  } catch (e) {
    next(e);
  }
}

export async function postWebauthnRegisterVerify(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = webauthnRegisterVerifyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationAppError(parsed.error);
    }

    const { nickname, response } = parsed.data;
    await settingsService.webauthnRegistrationVerify(
      req.auth!.sub,
      nickname,
      response as unknown as RegistrationResponseJSON
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function getWebauthnCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const credentials = await settingsService.listWebauthnCredentials(req.auth!.sub);

    res.status(200).json({ credentials });
  } catch (e) {
    next(e);
  }
}

export async function deleteWebauthnCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const credentialId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const ok = await settingsService.removeWebauthnCredential(req.auth!.sub, credentialId);
    if (!ok) {
      res.status(404).json({ message: "Credential not found.", code: "NOT_FOUND" });
      return;
    }

    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
