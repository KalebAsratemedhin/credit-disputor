import path from "path";
import crypto from "crypto";
import { Router } from "express";
import {
  AVATAR_FILENAME_RANDOM_BYTES,
  AVATAR_MAX_FILE_BYTES,
  AVATAR_UPLOAD_SUBDIR,
} from "../../lib/constants";
import { InvalidAvatarTypeError } from "../../lib/errors";
import { createUploadMiddleware } from "../../lib/upload/multerFactory";
import {
  changePasswordLimiter,
  securityMutateLimiter,
  totpVerifyLimiter,
} from "../../middlewares/rateLimit.middleware";
import * as settingsController from "../../controllers/v1/settings.controller";

const router = Router();

const avatarUpload = createUploadMiddleware({
  subdir: AVATAR_UPLOAD_SUBDIR,
  maxBytes: AVATAR_MAX_FILE_BYTES,
  allowedMimeTypes: /^image\/(jpeg|png|webp)$/,
  invalidMimeTypeError: (file) => new InvalidAvatarTypeError(file.mimetype),
  filename: ({ userId, originalname }) => {
    const ext = path.extname(originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";

    return `${userId}-${crypto.randomBytes(AVATAR_FILENAME_RANDOM_BYTES).toString("hex")}${safeExt}`;
  },
});

router.get("/me", settingsController.getMe);
router.patch("/me", securityMutateLimiter, settingsController.patchMe);
router.post("/me/password", changePasswordLimiter, settingsController.postMePassword);
router.post(
  "/me/avatar",
  securityMutateLimiter,
  avatarUpload.single("avatar"),
  settingsController.postMeAvatar
);

router.get("/security/status", settingsController.getSecurityStatus);
router.post("/security/totp/setup", securityMutateLimiter, settingsController.postTotpSetup);
router.post("/security/totp/verify", totpVerifyLimiter, settingsController.postTotpVerify);
router.delete("/security/totp", securityMutateLimiter, settingsController.deleteTotp);
router.post(
  "/security/backup-codes/regenerate",
  securityMutateLimiter,
  settingsController.postBackupCodesRegenerate
);

router.post(
  "/security/webauthn/register/options",
  securityMutateLimiter,
  settingsController.postWebauthnRegisterOptions
);
router.post(
  "/security/webauthn/register/verify",
  securityMutateLimiter,
  settingsController.postWebauthnRegisterVerify
);
router.get("/security/webauthn/credentials", settingsController.getWebauthnCredentials);
router.delete(
  "/security/webauthn/credentials/:id",
  securityMutateLimiter,
  settingsController.deleteWebauthnCredential
);

export default router;
