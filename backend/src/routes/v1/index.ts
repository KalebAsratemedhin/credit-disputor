import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import settingsRoutes from "./settings.routes";

const router = Router();

router.use(requireAuth);
router.use(settingsRoutes);

export default router;
