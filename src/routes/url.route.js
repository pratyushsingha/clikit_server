import { Router } from "express";

import {
  customDomain,
  deleteShortUrl,
  generateQrCode,
  generateShortUrl,
  getUserUrls,
  linkAnalytics,
  sevenDaysClickAnalytics,
  updateBackHalf,
} from "../controllers/url.controller.js";
import { verifyJWT, verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/short").post(verifyUser, generateShortUrl);
router.route("/qrcode/:_id").post(verifyUser, generateQrCode);
router.route("/remove/:_id").delete(verifyJWT, deleteShortUrl);
router.route("/back-half/:_id").patch(verifyJWT, updateBackHalf);
router.route("/verify-domain").post(verifyJWT, customDomain);
router.route("/my").get(verifyJWT, getUserUrls);
router.route("/analytics/:_id").get(verifyJWT, linkAnalytics);
router.route("/sevenDays/:_id").get(verifyJWT, sevenDaysClickAnalytics);

export default router;
