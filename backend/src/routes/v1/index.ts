import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import preferencesRoutes from "./preferences.routes";
import settingsRoutes from "./settings.routes";

const router = Router();

router.use(requireAuth);
router.use(preferencesRoutes);
router.use(settingsRoutes);

export default router;
