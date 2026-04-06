import { Router } from "express";
import * as bureauConnectionController from "../../controllers/v1/bureauConnection.controller";
import { bureauConnectionPiiLimiter } from "../../middlewares/rateLimit.middleware";

const router = Router();

router.post("/bureau-connection/start", bureauConnectionPiiLimiter, bureauConnectionController.postStart);
router.post(
  "/bureau-connection/:connectionId/identity",
  bureauConnectionPiiLimiter,
  bureauConnectionController.postIdentity
);
router.post(
  "/bureau-connection/:connectionId/address",
  bureauConnectionPiiLimiter,
  bureauConnectionController.postAddress
);
router.post(
  "/bureau-connection/:connectionId/consent",
  bureauConnectionPiiLimiter,
  bureauConnectionController.postConsent
);
router.post(
  "/bureau-connection/:connectionId/experian/kiq-answers",
  bureauConnectionPiiLimiter,
  bureauConnectionController.postKiqAnswers
);
router.get("/bureau-connection/:connectionId/status", bureauConnectionController.getStatus);

export default router;
