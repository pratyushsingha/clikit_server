import { Router } from "express";
import {
  stripeWebhook,
  subscriptionCheckoutSession,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, subscriptionCheckoutSession);
router.route("/webhook").post(stripeWebhook);

export default router;
