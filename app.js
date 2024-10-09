import express from "express";
import cors from "cors";
import requestIp from "request-ip";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import Useragent from "express-useragent";
import cron from "node-cron";

import { ApiError } from "./src/utils/ApiError.js";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    console.log("Status Code:", res.statusCode); // Log the status code
    if (res.statusCode < 100 || res.statusCode > 599) {
      res.statusCode = 500; // Set to 500 if invalid
    }
    return originalSend.call(this, body);
  };
  next();
});

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

cron.schedule("0 0 * * *", async () => {
  try {
    await checkSubscriptionExpiry();
    console.log("Checked for expired subscriptions");
  } catch (error) {
    console.error("Error checking subscriptions:", error);
  }
});

import urlRouter from "./src/routes/url.route.js";
import linkRouter from "./src/routes/link.route.js";
import userRouter from "./src/routes/user.route.js";
import healthCheckRouter from "./src/routes/healthcheck.route.js";
import domainRouter from "./src/routes/domain.route.js";
import subscriptionRouter from "./src/routes/subscription.route.js";
import { checkSubscriptionExpiry } from "./src/controllers/subscription.controller.js";

app.use("/api/v1/url", urlRouter);
app.use("/", linkRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/domain", domainRouter);
app.use("/api/v1/", healthCheckRouter);
app.use("/api/v1/subscription", subscriptionRouter);

export { app };
