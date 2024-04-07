import express from "express";
import cors from "cors";
import requestIp from "request-ip";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import  Useragent  from "express-useragent";

import { ApiError } from "./src/utils/ApiError.js";


const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(requestIp.mw());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.clientIp;
  },
  handler: (_, __, ___, options) => {
    throw new ApiError(
      options.statusCode || 500,
      `There are too many requests. You are only allowed ${
        options.max
      } requests per ${options.windowMs / 60000} minutes`
    );
  },
});

app.use(limiter);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(Useragent.express());

import urlRouter from "./src/routes/url.route.js";
import linkRouter from "./src/routes/link.route.js";
import userRouter from "./src/routes/user.route.js";
import healthCheckRouter from "./src/routes/healthcheck.route.js";

app.use("/api/v1/url", urlRouter);
app.use("/", linkRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/", healthCheckRouter);

export { app };
