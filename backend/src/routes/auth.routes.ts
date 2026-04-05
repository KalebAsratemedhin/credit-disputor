import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  forgotPasswordLimiter,
  googleSignInLimiter,
  resendOtpLimiter,
  resetPasswordLimiter,
  signinMfaSendLimiter,
  signinMfaVerifyLimiter,
  signinMfaWebauthnOptionsLimiter,
  verifyOtpLimiter,
} from "../middlewares/rateLimit.middleware";
import { requireMfaToken } from "../middlewares/mfaToken.middleware";

const router = Router();

router.post("/signup", authController.postSignup);
router.post("/signin", authController.postSignin);
router.post(
  "/signin/send-code",
  signinMfaSendLimiter,
  requireMfaToken,
  authController.postSigninSendCode
);
router.post(
  "/signin/resend-code",
  signinMfaSendLimiter,
  requireMfaToken,
  authController.postSigninResendCode
);
router.post(
  "/signin/mfa/verify",
  signinMfaVerifyLimiter,
  requireMfaToken,
  authController.postSigninMfaVerify
);
router.post(
  "/signin/webauthn/authentication-options",
  signinMfaWebauthnOptionsLimiter,
  requireMfaToken,
  authController.postSigninWebauthnAuthenticationOptions
);
router.post(
  "/signin/webauthn/authentication-verify",
  signinMfaVerifyLimiter,
  requireMfaToken,
  authController.postSigninWebauthnAuthenticationVerify
);
router.post("/google", googleSignInLimiter, authController.postGoogleSignIn);
router.post("/verify-email", verifyOtpLimiter, authController.postVerifyEmail);
router.post(
  "/resend-email-verification",
  resendOtpLimiter,
  authController.postResendEmailVerification
);
router.post("/forgot-password", forgotPasswordLimiter, authController.postForgotPassword);
router.post("/reset-password", resetPasswordLimiter, authController.postResetPassword);
router.post("/refresh", authController.postRefresh);
router.get("/me", requireAuth, authController.getMe);

export default router;
