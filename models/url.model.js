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
      required: true,
    },
    originalUrl: {
      type: String,
      required: true,
      index: true,
    },
    shortenUrl: {
      type: String,
      required: true,
    },
    clicks: {
      type: Number,
      required: true,
      default: 0,
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
