import { Router } from "express";
import {
  buySubscription,
  cancelSubscription,
  getRazorpayKey,
  paymentVerification,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/subscribe").get(verifyJWT, buySubscription);
router.route("/verify").post(verifyJWT, paymentVerification);
router.route("/cancel").post(verifyJWT, cancelSubscription);
router.route("/razorpay-key").get(verifyJWT, getRazorpayKey);

export default router;
