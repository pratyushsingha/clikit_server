import crypto from "crypto";

import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { Subscription } from "../../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { razorpayInstance } from "../utils/Razorpay.js";

const buySubscription = asyncHandler(async (req, res) => {
  if (!razorpayInstance) {
    console.error("Razorpay Error: `key_id` is mandatory");
    throw new ApiError(500, "Internal server error");
  }

  const user = await User.findById(req.user._id);
  if (user.userType === "premium") {
    throw new ApiError(400, "You are already a premium user");
  }

  const plan_id = process.env.RAZORPAY_PLAN_ID;

  const subscription = await razorpayInstance.subscriptions.create({
    plan_id,
    customer_notify: 1,
    quantity: 1,
    total_count: 1,
    expire_by: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  });

  if (!subscription) {
    throw new ApiError(500, "Unable to create subscription");
  }

  user.subscriptionId = subscription.id;
  await user.save();

  await Subscription.create({
    userId: req.user._id,
    price: 50,
    subscriptionId: subscription.id,
    paymentStatus: "PENDING",
    startsAt: new Date(subscription.start_at * 1000),
    expiredAt: new Date(subscription.end_at * 1000),
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "Subscription created successfully")
    );
});

const paymentVerification = asyncHandler(async (req, res) => {
  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const user = await User.findById(req.user._id);
  const subscriptionId = user.subscriptionId;
  const subscription = await Subscription.findOne({ subscriptionId });

  let expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_payment_id + "|" + subscriptionId, "utf-8")
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    subscription.paymentStatus = "COMPLETED";
    subscription.razorpay_signature = razorpay_signature;
    subscription.razorpay_payment_id = razorpay_payment_id;
    subscription.razorpay_subscription_id = razorpay_subscription_id;

    user.userType = "premium";

    subscription.save();
    user.save();
    res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?ref=${razorpay_payment_id}`
    );
  } else {
    res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
    throw new ApiError(400, "Invalid razorpay signature");
  }
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  await razorpay.subscriptions.cancel(user.subscriptionId);

  const subscription = await Subscription.findOne({
    razorpay_subscription_id: user.subscriptionId,
  });

  await subscription.remove();
  user.subscriptionId = undefined;
  user.userType = "free";
  user.save();

  res
    .status(200)
    .json(new ApiResponse(200, {}, "subscription cancelled successfully"));
});

const getRazorpayKey = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        process.env.RAZORPAY_KEY_ID,
        "Razorpay key fetched successfully"
      )
    );
});

export {
  buySubscription,
  paymentVerification,
  cancelSubscription,
  getRazorpayKey,
};
