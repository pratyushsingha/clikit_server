import { Router } from "express";
import { validateUrl } from "../validators/url.validator.js";
import {
  customDomain,
  deleteShortUrl,
  generateQrCode,
  generateShortUrl,
  getUserUrls,
  updateBackHalf,
  urlMetaData,
} from "../controllers/url.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/short").post(validateUrl(), verifyJWT, generateShortUrl);
router.route("/qrcode").post(validateUrl(), verifyJWT, generateQrCode);
router.route("/remove/:_id").delete(verifyJWT, deleteShortUrl);
router.route("/back-half/:_id").patch(verifyJWT, updateBackHalf);
router.route("/url-overview").get(verifyJWT, urlMetaData);
router.route("/verify-domain").post(verifyJWT, customDomain);
router.route("/my").get(verifyJWT, getUserUrls);

export default router;
