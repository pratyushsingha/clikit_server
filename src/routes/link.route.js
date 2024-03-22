import { Router } from "express";
import {
  generateShortUrl,
  redirectUrl,
} from "../controllers/url.controller.js";

const router = Router();

router.route("/:urlId").get(redirectUrl);

export default router;
