import mongoose, { Schema } from "mongoose";

const domainSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    isDomainVerified: {
      type: Boolean,
      default: false,
    },
    cnameRecord: {
      name: String,
      value: String,
    },
    owner: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Domain = mongoose.model("Domain", domainSchema);
