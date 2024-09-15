import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    subscriptionId: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
      required: true,
    },
    expiredAt: {
      type: Date,
      required: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    razorpay_signature: {
      type: String,
    },
    razorpay_payment_id: {
      type: String,
    },
    razorpay_subscription_id: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
