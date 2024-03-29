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
  urlMetaData,
} from "../controllers/url.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/short").post(verifyJWT, generateShortUrl);
router.route("/qrcode").post(verifyJWT, generateQrCode);
router.route("/remove/:_id").delete(verifyJWT, deleteShortUrl);
router.route("/back-half/:_id").patch(verifyJWT, updateBackHalf);
router.route("/metadata/:_id").get(verifyJWT, urlMetaData);
router.route("/verify-domain").post(verifyJWT, customDomain);
router.route("/my").get(verifyJWT, getUserUrls);
router.route("/analytics/:_id").get(verifyJWT, linkAnalytics);
router.route("/sevenDays/:_id").get(verifyJWT, sevenDaysClickAnalytics);

export default router;
