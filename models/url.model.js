import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const defaultExpiry = () => {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 30);
  return currentDate;
};

const urlSchema = new Schema(
  {
    urlId: {
      type: String,
      unique: true,
    },
    domainId: {
      type: Schema.Types.ObjectId,
      ref: "Domain",
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
    customUrl: {
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
    logo: {
      type: String,
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
urlSchema.plugin(mongooseAggregatePaginate);

export const Url = mongoose.model("Url", urlSchema);
