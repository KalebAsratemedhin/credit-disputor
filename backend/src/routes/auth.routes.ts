import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/signup", authController.postSignup);
router.post("/signin", authController.postSignin);
router.post("/refresh", authController.postRefresh);
router.get("/me", requireAuth, authController.getMe);

export default router;
