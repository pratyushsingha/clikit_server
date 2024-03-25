import { Router } from "express";
import { validateUrl } from "../validators/url.validator.js";
import {
  deleteShortUrl,
  generateQrCode,
  generateShortUrl,
  updateBackHalf,
} from "../controllers/url.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/short").post(validateUrl(), verifyJWT, generateShortUrl);
router.route("/qrcode").post(validateUrl(), verifyJWT, generateQrCode);
router.route("/remove/:_id").delete(verifyJWT, deleteShortUrl);
router.route("/back-half/:_id").patch(verifyJWT, updateBackHalf);

export default router;
