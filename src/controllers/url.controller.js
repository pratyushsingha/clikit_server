import { nanoid, customAlphabet } from "nanoid";
import QRCode from "qrcode";
import getMetaData from "metadata-scraper";
import mongoose from "mongoose";
import { getDnsRecords } from "@layered/dns-records";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../../models/url.model.js";
import { Analytics } from "../../models/analytics.model.js";
import { User } from "../../models/user.model.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";

const generateShortUrl = asyncHandler(async (req, res) => {
  const { originalUrl, expiresIn } = req.body;
  if (!originalUrl) throw new ApiError(422, "url can't be empty");

  const url = await Url.findOne({ originalUrl, owner: req.user._id });
  const urlId = nanoid(5);
  const shortenUrl = `${process.env.BASE_URL}/${urlId}`;
  if (!shortenUrl)
    throw new ApiError(500, "something went wrong while looming the url");

  let generatedUrl;
  if (!url) {
    generatedUrl = await Url.create({
      urlId,
      originalUrl,
      shortenUrl,
      expiresIn,
      isLoggedIn: req?.user?._id ? true : false,
      owner: req?.user?._id,
    });
  } else {
    generatedUrl = await Url.findByIdAndUpdate(
      url?._id,
      {
        $set: {
          urlId,
          shortenUrl,
        },
      },
      { new: true }
    );
  }
  return res
    .status(201)
    .json(new ApiResponse(200, generatedUrl, "url shorten successfully"));
});

const redirectUrl = asyncHandler(async (req, res) => {
  const { urlId } = req.params;

  const url = await Url.findOne({ urlId });
  if (!url) throw new ApiError(422, "url doesn't exists");

  url.clicks++;
  await Analytics.create({
    useragent: req.useragent.source,
    browser: req.useragent.browser,
    device: req.useragent.isMobile ? "Mobile" : "Desktop",
    platform: req.useragent.platform,
    url: url?._id,
  });
  await url.save();
  return res.redirect(url.originalUrl);
});

const generateQrCode = asyncHandler(async (req, res) => {
  const { originalUrl } = req.body;
  if (!originalUrl) throw new ApiError(422, "url is required");

  const qrcode = await QRCode.toDataURL(originalUrl);
  if (!qrcode) {
    throw new ApiError(500, "something went wrong while generating qrcode");
  }
  let generatedQrcode;
  const url = await Url.findOne({ originalUrl });
  if (!url) {
    generatedQrcode = await Url.create({
      qrcode,
      originalUrl,
      isLoggedIn: req?.user?._id ? true : false,
      owner: req.user?._id,
    });
  }
  generatedQrcode = await Url.findByIdAndUpdate(
    url?._id,
    {
      $set: {
        qrcode: qrcode,
      },
    },
    { new: true }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(200, generatedQrcode, "qr code generated successfully")
    );
});

const deleteShortUrl = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) throw new ApiError(422, "_id is required");

  const shortUrl = await Url.findById(_id);
  if (!shortUrl) throw new ApiError(401, "url doesn't exists");

  const deletedUrl = await Url.findByIdAndDelete(_id);

  if (!deletedUrl)
    throw new ApiError(500, "something went wrong while deleting url");

  return res
    .status(201)
    .json(new ApiResponse(200, deletedUrl, "url delted successfully"));
});

const updateBackHalf = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { urlId } = req.body;

  if (!_id) throw new ApiError(422, "_id is required");

  const url = await Url.findById(_id);
  if (!url) throw new ApiError(401, "url doesn't exists");

  const updatedQrcode = await QRCode.toDataURL(url.originalUrl);

  const updatedurlSchema = await Url.findByIdAndUpdate(
    _id,
    {
      $set: {
        urlId,
        shortenUrl: `${process.env.BASE_URL}/${urlId}`,
        qrcode: updatedQrcode,
      },
    },
    { new: true }
  );

  if (!updatedurlSchema)
    throw new ApiError(500, "something went wrong while updating the url");

  return res
    .status(201)
    .json(
      new ApiResponse(201, updatedurlSchema, "back-half updated successfully")
    );
});

const urlMetaData = asyncHandler(async (req, res) => {
  const { _id } = req.body;
  if (!_id) throw new ApiError(422, "url id is required");

  const url = await Url.findById(_id);
  if (!url) throw new ApiError(400, "url doesn't exists");
  try {
    const metadata = await getMetaData(url.originalUrl);
    return res
      .status(201)
      .json(new ApiResponse(200, metadata, "metadata fetched successfully"));
  } catch (err) {
    throw new ApiError(500, err?.message);
  }
});

const customDomain = asyncHandler(async (req, res) => {
  const { domain, _id } = req.body;
  const veificationCode = customAlphabet(
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ=_?",
    16
  );
  console.log(veificationCode(), domain);
  setInterval(async () => {
    try {
      const txtRecords = await getDnsRecords("pratyushsingha.tech", "TXT");
      console.log(txtRecords);
      // const dnsRecords = await dnsPromises.resolve(domain, "TXT");
      // console.log(dnsRecords);
      const verify = txtRecords.some((dnsRecord) =>
        dnsRecord.includes(veificationCode)
      );
      console.log(verify);
      // // console.log("dns", dnsRecords);
      if (verify) {
        const url = await Url.findById(_id);
        const CustomShortUrl = await Url.findByIdAndDelete(
          _id,
          {
            $set: {
              shortenUrl: `${domain}/${url.urlId}`,
            },
          },
          { new: true }
        );
        return res
          .status(200)
          .json(
            new ApiResponse(201, CustomShortUrl, "url updated successfully")
          );
      }
      console.log("falied to verify ownership");
    } catch (err) {
      console.log(500, err?.message);
    }
  }, 20000);
});

const getUserUrls = asyncHandler(async (req, res) => {
  const { page, limit } = req.params;

  const urlAggregate = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req?._id),
      },
    },
    {
      $lookup: {
        from: "urls",
        localField: "_id",
        foreignField: "owner",
        as: "urls",
      },
    },
    {
      $project: {
        urls: 1,
      },
    },
  ]);

  const urls = await Url.aggregatePaginate(
    urlAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "allUrls",
        docs: "urls",
      },
    })
  );
  return res
    .status(201)
    .json(new ApiResponse(200, urls, "urls fetched successfully"));
});

const linkAnalytics = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const url = await Url.findById(_id);
  if (!(url.owner.toString() === req.user._id.toString()))
    throw new ApiError(400, "u are not the owner of this link");

  const analytics = await Url.aggregate([
    [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
        },
      },
      {
        $lookup: {
          from: "analytics",
          localField: "_id",
          foreignField: "url",
          as: "analytics",
        },
      },
      {
        $unwind: "$analytics",
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          browsers: { $addToSet: "$analytics.browser" },
          devices: { $addToSet: "$analytics.device" },
          platforms: { $addToSet: "$analytics.platform" },
          mobileDevices: {
            $addToSet: {
              $cond: {
                if: { $eq: ["$analytics.device", "Mobile"] },
                then: "$analytics",
                else: null,
              },
            },
          },
          iPhoneVisits: {
            $sum: {
              $cond: {
                if: { $eq: ["$analytics.device", "Mobile"] },
                then: {
                  $cond: {
                    if: { $eq: ["$analytics.platform", "iPhone"] },
                    then: 1,
                    else: 0,
                  },
                },
                else: 0,
              },
            },
          },
          androidVisits: {
            $sum: {
              $cond: {
                if: { $eq: ["$analytics.device", "Mobile"] },
                then: {
                  $cond: {
                    if: { $eq: ["$analytics.platform", "Android"] },
                    then: 1,
                    else: 0,
                  },
                },
                else: 0,
              },
            },
          },
          ipadVisits: {
            $sum: {
              $cond: {
                if: { $eq: ["$analytics.device", "Mobile"] },
                then: {
                  $cond: {
                    if: { $eq: ["$analytics.platform", "iPad"] },
                    then: 1,
                    else: 0,
                  },
                },
                else: 0,
              },
            },
          },
          desktopVisits: {
            $addToSet: {
              $cond: {
                if: { $eq: ["$analytics.device", "Desktop"] },
                then: "$analytics",
                else: null,
              },
            },
          },
          linuxVisits: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$analytics.device", "Desktop"],
                },
                then: {
                  $cond: {
                    if: {
                      $eq: ["$analytics.platform", "Linux"],
                    },
                    then: 1,
                    else: 0,
                  },
                },
                else: 0,
              },
            },
          },
          windowsVisits: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$analytics.device", "Desktop"],
                },
                then: {
                  $cond: {
                    if: {
                      $eq: ["$analytics.platform", "Microsoft Windows"],
                    },
                    then: 1,
                    else: 0,
                  },
                },
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalVisits: 1,
          browsers: { $size: "$browsers" },
          devices: { $size: "$devices" },
          platforms: { $size: "$platforms" },
          mobileDevices: { $size: "$mobileDevices" },
          iPhoneVisits: 1,
          androidVisits: 1,
          ipadVisits: 1,
          desktopVisits: { $size: "$desktopVisits" },
          linuxVisits: 1,
          windowsVisits: 1,
        },
      },
    ],
  ]);

  if (!analytics)
    throw new ApiError(500, "something went wrong while fetching the details");

  return res
    .status(201)
    .json(
      new ApiResponse(200, analytics, "link analytics fetched successfully")
    );
});

const sevenDaysClickAnalytics = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const url = await Url.findById(_id);
  if (!(url.owner.toString() === req.user._id.toString()))
    throw new ApiError(400, "u are not the owner of this link");

  const currentDate = new Date();
  let beforeSevenDayDate = new Date(currentDate);
  beforeSevenDayDate.setDate(beforeSevenDayDate.getDate() - 7);
  // console.log("current", currentDate, beforeSevenDayDate);

  const clicksPerDay = await Url.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    {
      $lookup: {
        from: "analytics",
        localField: "_id",
        foreignField: "url",
        as: "analytics",
      },
    },
    {
      $unwind: {
        path: "$analytics",
      },
    },
    {
      $match: {
        "analytics.createdAt": {
          $lte: currentDate,
          $gte: beforeSevenDayDate,
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$analytics.createdAt" },
        },
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        "alanytics.createdAt": 1,
      },
    },
  ]);

  return res
    .status(201)
    .json(new ApiResponse(200, clicksPerDay, "analytics fetched successfully"));
});

export {
  generateShortUrl,
  redirectUrl,
  generateQrCode,
  deleteShortUrl,
  updateBackHalf,
  urlMetaData,
  customDomain,
  getUserUrls,
  linkAnalytics,
  sevenDaysClickAnalytics,
};
