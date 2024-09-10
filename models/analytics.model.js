import mongoose, { Schema } from "mongoose";

const analyticsSchema = new Schema(
  {
    useragent: {
      type: String,
    },
    browser: {
      type: String,
    },
    device: {
      type: String,
    },
    platform: {
      type: String,
    },
    url: {
      type: Schema.Types.ObjectId,
      ref: "Url",
    },
  },
  {
    timestamps: true,
  }
);

export const Analytics = mongoose.model("Analytics", analyticsSchema);
