import mongoose, { Schema } from "mongoose";

const defaultExpiry = () => {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 30);
  return currentDate;
};

const urlSchema = new Schema(
  {
    urlId: {
      type: String,
    },
    originalUrl: {
      type: String,
      required: true,
      index: true,
    },
    shortenUrl: {
      type: String,
    },
    qrcode: {
      type: String,
    },
    expiredIn: {
      type: Date,
      default: defaultExpiry,
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    analytics: {
      type: [
        {
          timestamp: { type: Date, default: Date.now },
          ipAddress: String,
          userAgent: String,
          browser: String,
          device: String,
          platform: String,
        },
      ],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Url = mongoose.model("Url", urlSchema);
