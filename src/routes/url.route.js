import { Router } from "express";

import {
  customDomain,
  deleteShortUrl,
  generateCustomUrl,
  generateQrCode,
  generateShortUrl,
  getUrlsByDomain,
  getUserUrls,
  linkAnalytics,
  searchUrls,
  sevenDaysClickAnalytics,
  updateBackHalf,
  urlDetails,
} from "../controllers/url.controller.js";
import { verifyJWT, verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/short/:domainId").post(verifyJWT, generateCustomUrl);
router.route("/short").post(verifyUser, generateShortUrl);
router.route("/qrcode/:_id").post(verifyUser, generateQrCode);
router.route("/remove/:_id").delete(verifyJWT, deleteShortUrl);
router.route("/back-half/:_id").patch(verifyJWT, updateBackHalf);
router.route("/verify-domain").post(verifyJWT, customDomain);
router.route("/my").get(verifyJWT, getUserUrls);
router.route("/analytics/:_id").get(verifyJWT, linkAnalytics);
router.route("/sevenDays/:_id").get(verifyJWT, sevenDaysClickAnalytics);
router.route("/details/:_id").get(verifyJWT, urlDetails);
router.route("/search").get(verifyJWT, searchUrls);
router.route("/domain/:domainId").get(verifyJWT, getUrlsByDomain);

export default router;
