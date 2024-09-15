import { Router } from "express";
import {
  buySubscription,
  paymentVerification,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/subscribe").get(verifyJWT, buySubscription);
router.route("/verify").get(verifyJWT, paymentVerification);

export default router;
