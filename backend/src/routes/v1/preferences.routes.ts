import { Router } from "express";
import * as preferencesController from "../../controllers/v1/preferences.controller";
import { securityMutateLimiter } from "../../middlewares/rateLimit.middleware";

const router = Router();

router.get("/me/preferences", preferencesController.getPreferences);
router.patch("/me/preferences", securityMutateLimiter, preferencesController.patchPreferences);

export default router;
