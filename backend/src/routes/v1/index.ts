import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import phoneRoutes from "./phone.routes";
import preferencesRoutes from "./preferences.routes";
import settingsRoutes from "./settings.routes";

const router = Router();

router.use(requireAuth);
router.use(phoneRoutes);
router.use(preferencesRoutes);
router.use(settingsRoutes);

export default router;
