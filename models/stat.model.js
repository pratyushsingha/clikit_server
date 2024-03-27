import mongoose, { Schema } from "mongoose";

const statSchema = new Schema(
  {
    urlId: {
      type: Schema.Types.ObjectId,
      ref: "Url",
    },
    os: {
      type: String,
    },
    device: {
      type: String,
    },
    browser: {
      type: String,
    },
    clicks: {
      type: Number,
      required: true,
      default: 0,
    },
  },

  { new: true }
);
export const Stat = mongoose.model("Stat", statSchema);
