import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addDomain,
  verifyDomainOwnership,
} from "../controllers/domain.controller.js";

const router = Router();

router.route("/").post(verifyJWT, addDomain);
router.route("/verify").get(verifyJWT, verifyDomainOwnership);

export default router;
