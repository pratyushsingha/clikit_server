import { Router } from "express";
import { validateUrl } from "../validators/url.validator.js";
import {
  generateQrCode,
  generateShortUrl,
} from "../controllers/url.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/short").post(validateUrl(),verifyJWT, generateShortUrl);
router.route("/qrcode").post(validateUrl(),verifyJWT, generateQrCode);

export default router;
