import { Router } from "express";
import * as healthController from "../controllers/health.controller";

const router = Router();

router.get("/health", healthController.getHealth);
router.get("/health/db", healthController.getHealthDb);

export default router;
