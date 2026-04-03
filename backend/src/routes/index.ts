import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import v1Routes from "./v1";

const router = Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/v1", v1Routes);

export default router;
