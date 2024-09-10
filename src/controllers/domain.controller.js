import dns from "dns";
import { nanoid } from "nanoid";

import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const resolveTxtRecord = (domain) => {
  return new Promise((resolve, reject) => {
    dns.resolveTxt(domain, (err, records) => {
      if (err) {
        reject(err);
      } else {
        resolve(records);
      }
    });
  });
};

const addDomain = asyncHandler(async (req, res) => {
  const { domain } = req.body;

  const generateTXTtoken = nanoid(20);
  if (!nanoid) {
    throw new ApiError(500, "Unable to generate token");
  }

  const txtRecord = {
    name: "_verification.tinytap.vercel.app",
    recordType: "TXT",
    value: generateTXTtoken,
  };
  const saveDomain = await User.findByIdAndUpdate(
    req.user._id,
    {
      domain,
      txtRecord,
    },
    {
      new: true,
    }
  );

  if (!saveDomain) {
    throw new ApiError(500, "Unable to save domain");
  }

  res.status(201).json(
    new ApiResponse(
      200,
      {
        domain,
        txtRecord,
        instructions:
          "Log in to your DNS provider's management console and add the above TXT record to your domain's DNS settings. It may take some time for DNS changes to propagate.",
      },
      "Domain added successfully"
    )
  );
});

const verifyDomainOwnership = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.isDomainVerified) {
    throw new ApiError(500, "domain already verified");
  } else {
    const records = await resolveTxtRecord(user.domain);
    const verificationRecord = records.find((record) =>
      record.includes(`${user.txtRecord.value}`)
    );

    if (verificationRecord) {
      user.isDomainVerified = true;
      await user.save();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { isDomainVerified: true },
            "Domain ownership verified successfully"
          )
        );
    } else {
      console.log("Verification failed: Token not found");
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { isDomainVerified: false },
            "Token not found...try again later"
          )
        );
    }
  }
});

export { addDomain, verifyDomainOwnership };
