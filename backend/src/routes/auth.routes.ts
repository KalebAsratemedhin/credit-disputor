import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  forgotPasswordLimiter,
  resendOtpLimiter,
  resetPasswordLimiter,
  verifyOtpLimiter,
} from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/signup", authController.postSignup);
router.post("/signin", authController.postSignin);
router.post("/verify-otp", verifyOtpLimiter, authController.postVerifyOtp);
router.post("/resend-otp", resendOtpLimiter, authController.postResendOtp);
router.post("/forgot-password", forgotPasswordLimiter, authController.postForgotPassword);
router.post("/reset-password", resetPasswordLimiter, authController.postResetPassword);
router.post("/refresh", authController.postRefresh);
router.get("/me", requireAuth, authController.getMe);

export default router;
