import mongoose, { Schema } from "mongoose";

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
  },
  {
    timestamps: true,
  }
);

export const Url = mongoose.model("Url", urlSchema);
