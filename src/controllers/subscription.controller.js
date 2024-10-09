import crypto from "crypto";

import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { Subscription } from "../../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { razorpayInstance } from "../utils/Razorpay.js";
import { resend } from "../utils/resend.js";

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

  console.log(subscription);
  const purchaseDate = new Date();

  user.subscriptionId = subscription.id;
  await user.save();

  await Subscription.create({
    userId: req.user._id,
    price: 50,
    subscriptionId: subscription.id,
    paymentStatus: "PENDING",
    startsAt: purchaseDate,
    expiredAt: new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
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

  console.log(expectedSignature.toString() === razorpay_signature.toString());

  if (expectedSignature.toString() === razorpay_signature.toString()) {
    subscription.paymentStatus = "COMPLETED";
    subscription.razorpay_signature = razorpay_signature;
    subscription.razorpay_payment_id = razorpay_payment_id;
    subscription.razorpay_subscription_id = razorpay_subscription_id;

    user.userType = "premium";

    await subscription.save();
    await user.save();
    res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?ref=${razorpay_payment_id}`
    );
  } else {
    res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  }
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.subscriptionId) {
    throw new ApiError(400, "No subscription found for the user");
  }

  try {
    const response = await razorpayInstance.subscriptions.cancel(
      user.subscriptionId
    );
    console.log("Razorpay cancellation response:", response);

    const subscription = await Subscription.findOne({
      razorpay_subscription_id: user.subscriptionId,
    });

    if (!subscription) {
      throw new ApiError(404, "Subscription not found");
    }

    await subscription.remove();
    user.userType = "free";
    user.subscriptionId = undefined;
    await user.save();

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Subscription cancelled successfully"));
  } catch (error) {
    console.error("Error during cancellation:", error);
    throw new ApiError(500, "Failed to cancel the subscription");
  }
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

const checkSubscriptionExpiry = asyncHandler(async (req, res) => {
  const currentDate = new Date();

  const resetUrl = `${import.meta.env.VITE_FRONTEND_URL}/pricing`;
  const expiredSubscriptions = await Subscription.find({
    expiredAt: { $lt: currentDate },
    paymentStatus: "COMPLETED",
  });

  for (const subscription of expiredSubscriptions) {
    const user = await Subscription.findOne(subscription.userId);

    if (user) {
      try {
        const sendSubscriptionExpiryEmail = await resend.emails.send({
          from: process.env.RESEND_SENDER_EMAIL,
          to: req.user.email,
          subject: "Renew Subscription",
          html: `<p>Hello, ${user.fullName}</p>
           <p>Your subscription has expired. Please click the link below to renew it:</p>
           <a href="${resetUrl}">Renew Subscription</a>
           <p>If you believe this is a mistake or have any questions, please contact our support.</p>`,
        });
        if (!sendSubscriptionExpiryEmail.error) {
          user.userType = "free";
          await user.save();
        }
      } catch (error) {
        console.error("Error sending subscription expiry email:", error);
      }
    }
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "checked for expired subscriptions"));
});

export {
  buySubscription,
  paymentVerification,
  cancelSubscription,
  getRazorpayKey,
  checkSubscriptionExpiry,
};
