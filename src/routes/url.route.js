import { Router } from "express";
import { validateUrl } from "../validators/url.validator.js";
import {
  generateQrCode,
  generateShortUrl,
} from "../controllers/url.controller.js";

const router = Router();

router.route("/short").post(validateUrl(), generateShortUrl);
router.route("/qrcode").post(validateUrl(), generateQrCode);

export default router;
