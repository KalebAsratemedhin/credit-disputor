import { Router } from "express";
import {
  phoneVerificationCheckLimiter,
  phoneVerificationSendLimiter,
} from "../../middlewares/rateLimit.middleware";
import * as phoneController from "../../controllers/v1/phone.controller";

const router = Router();

router.post(
  "/phone/send-verification",
  phoneVerificationSendLimiter,
  phoneController.postPhoneSendVerification
);
router.post("/phone/verify", phoneVerificationCheckLimiter, phoneController.postPhoneVerify);

export default router;
