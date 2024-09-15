import { nanoid } from "nanoid";
import QRCode from "qrcode";
import getMetaData from "metadata-scraper";
import mongoose from "mongoose";
import dns from "dns";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../../models/url.model.js";
import { Analytics } from "../../models/analytics.model.js";
import { User } from "../../models/user.model.js";
import { getMongoosePaginationOptions } from "../utils/helper.js";
import { Domain } from "../../models/domain.model.js";

const generateShortUrl = asyncHandler(async (req, res) => {
  const { originalUrl, expiredIn } = req.body;
  if (!originalUrl) throw new ApiError(422, "url can't be empty");
  const urlId = nanoid(5);
  const shortenUrl = `${process.env.BASE_URL}/${urlId}`;
  if (!shortenUrl)
    throw new ApiError(500, "something went wrong while looming the url");

  const metadata = await getMetaData(originalUrl);
  if (!metadata)
    throw new ApiError(500, "something went wrong while fetching the metadata");

  if (!req.user) {
    // const url = [
    //   {
    //     urlId,
    //     originalUrl,
    //     shortenUrl,
    //     logo:
    //       metadata.icon ||
    //       `https://ui-avatars.com/api/?name=${metadata.title}&background=random&color=fff`,
    //     isLoggedIn: false,
    //   },
    // ];
    const saveUrl = await Url.create({
      urlId,
      originalUrl,
      shortenUrl,
      logo:
        metadata.icon ||
        `https://ui-avatars.com/api/?name=${metadata.title}&background=random&color=fff`,
      isLoggedIn: false,
    });
    if (!saveUrl)
      throw new ApiError(
        500,
        "something went wrong while saving the url  locally"
      );

    return res
      .status(201)
      .json(new ApiResponse(200, [saveUrl], "url shorten successfully"));
  } else {
    const url = await Url.findOne({
      originalUrl,
      owner: req.user._id,
      isLoggedIn: true,
    });

    let generatedUrl;
    if (!url) {
      generatedUrl = await Url.create({
        urlId,
        originalUrl,
        shortenUrl,
        expiredIn,
        isLoggedIn: true,
        owner: req?.user?._id,
        logo: metadata.icon,
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
      .json(new ApiResponse(200, [generatedUrl], "url shorten successfully"));
  }
});

const redirectUrl = asyncHandler(async (req, res) => {
  const { urlId } = req.params;
  const url = await Url.findOne({ urlId }).populate("domainId");
  if (!url) throw new ApiError(422, "url doesn't exists");

  if (new Date() > new Date(url.expiresIn)) {
    await Url.deleteOne({ urlId });
    return res.status(401).json(new ApiResponse(401, {}, "Link expired"));
  } else {
    if (url.isLoggedIn === true) {
      await Analytics.create({
        useragent: req.useragent.source,
        browser: req.useragent.browser,
        device: req.useragent.isMobile ? "Mobile" : "Desktop",
        platform: req.useragent.platform,
        url: url?._id,
      });
    }

    return res.redirect(url.originalUrl);
  }
});

const generateQrCode = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) throw new ApiError(422, "urlId is required");

  const url = await Url.findById(_id);

  const qrcode = await QRCode.toDataURL(url?.originalUrl);
  if (!qrcode) {
    throw new ApiError(500, "something went wrong while generating qrcode");
  }

  let generatedQrcode;
  if (!url) {
    generatedQrcode = await Url.create({
      qrcode,
      originalUrl,
      isLoggedIn: req?.user?._id ? true : false,
      owner: req.user?._id || null,
    });
  }
  generatedQrcode = await Url?.findByIdAndUpdate(
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

  const urlExists = await Url.findOne({
    shortenUrl: `${process.env.BASE_URL}/${urlId}`,
  });

  if (urlExists) {
    throw new ApiError(422, "an url with this backhalf already exists");
  }

  const updatedurlSchema = await Url.findByIdAndUpdate(
    _id,
    {
      $set: {
        shortenUrl: `${process.env.BASE_URL}/${urlId}`,
        customUrl: url.customUrl.split("/")[0] + "/" + urlId,
        urlId,
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

// function generateVerificationTxt() {
//   const alphabet =
//     "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//   const nanoid = customAlphabet(alphabet, 16);
//   return nanoid();
// }

const customDomain = asyncHandler(async (req, res) => {
  const { domain, _id } = req.body;

  try {
    const dnsPromises = dns.promises;
    const dnsRecords = await dnsPromises.resolve4(domain);

    if (dnsRecords.length > 0) {
      return res.status(200).json({
        success: true,
        ipv4Addresses: dnsRecords,
        message:
          "IPv4 addresses resolved successfully. Add these addresses to your DNS portal.",
      });
    } else {
      return res.status(400).json({
        success: false,
        message:
          "No IPv4 addresses found for the domain. Make sure the domain is correctly configured.",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve IPv4 addresses. Please try again later.",
    });
  }
});

const getUserUrls = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const urlAggregate = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req._id),
      },
    },
    {
      $lookup: {
        from: "urls",
        localField: "_id",
        foreignField: "owner",
        as: "urls",
        pipeline: [
          {
            $match: {
              isLoggedIn: true,
            },
          },
        ],
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
  if (!(url.owner?.toString() === req.user._id.toString()))
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
          chromeVisits: {
            $sum: {
              $cond: {
                if: { $eq: ["$analytics.browser", "Chrome"] },
                then: 1,
                else: 0,
              },
            },
          },
          safariClicks: {
            $sum: {
              $cond: {
                if: { $eq: ["$analytics.browser", "Safari"] },
                then: 1,
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
          browsers: {
            $size: "$browsers",
          },
          devices: { $size: "$devices" },
          platforms: { $size: "$platforms" },
          mobileDevices: { $size: "$mobileDevices" },
          iPhoneVisits: 1,
          androidVisits: 1,
          ipadVisits: 1,
          desktopVisits: { $size: "$desktopVisits" },
          linuxVisits: 1,
          windowsVisits: 1,
          chromeVisits: 1,
          safariClicks: 1,
        },
      },
    ],
  ]);

  if (!analytics)
    throw new ApiError(500, "something went wrong while fetching the details");

  // const operatingSystemViews = analytics.map(
  //   ({ linuxVisits, windowsVisits }) => ({
  //     linuxVisits,
  //     windowsVisits,
  //     androidVisits: analytics[0].androidVisits,
  //   })
  // );

  // const deviceViews = analytics.map(
  //   ({ mobileDevices, ipadVisits, desktopVisits }) => ({
  //     mobileDevices,
  //     ipadVisits,
  //     desktopVisits,
  //   })
  // );

  // const analyticsData = [
  //   { operatingSystemViews: operatingSystemViews },
  //   { deviceClicks: deviceViews },
  //   { chromeVisits: analytics[0].chromeVisits },
  //   { totalVisits: analytics[0].totalVisits },
  // ];

  return res
    .status(201)
    .json(
      new ApiResponse(200, analytics[0], "link analytics fetched successfully")
    );
});

const sevenDaysClickAnalytics = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  const url = await Url.findById(_id);
  if (!(url?.owner?.toString() === req.user?._id.toString()))
    throw new ApiError(400, "u are not the owner of this link");

  const currentDate = new Date();
  let beforeSevenDayDate = new Date(currentDate);
  beforeSevenDayDate.setDate(beforeSevenDayDate.getDate() - 7);
  console.log("current", currentDate, beforeSevenDayDate);

  const sevenDays = [];
  for (let i = 1; i <= 7; i++) {
    const date = new Date(beforeSevenDayDate);
    date.setDate(date.getDate() + i);
    sevenDays.push(date);
  }

  const analyticsAggregation = await Url.aggregate([
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
        "analytics.createdAt": -1,
      },
    },
  ]);

  const sevenDaysAnalytics = sevenDays.map((day) => {
    const date = day.toISOString().split("T")[0];

    const clicks = analyticsAggregation.find((click) => click._id === date);
    return {
      _id: date,
      clicks: clicks ? clicks.clicks : 0,
    };
  });

  return res
    .status(201)
    .json(
      new ApiResponse(200, sevenDaysAnalytics, "analytics fetched successfully")
    );
});

const urlDetails = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) throw new ApiError(422, "_id is required");

  const url = await Url.findById(_id);
  if (!url) throw new ApiError(401, "url doesn't exists");

  return res
    .status(200)
    .json(new ApiResponse(200, url, "url fetched successfully"));
});

const searchUrls = asyncHandler(async (req, res) => {
  const query = req.query.q;
  const urls = await Url.find({
    $and: [
      {
        $or: [
          { originalUrl: { $regex: query, $options: "i" } },
          {
            shortenUrl: { $regex: query, $options: "i" },
          },
          {
            customUrl: { $regex: query, $options: "i" },
          },
        ],
      },
      { owner: req.user._id },
    ],
  });
  if (!urls) {
    throw new ApiError(500, "something went wrong while getting urls");
  } else {
    res
      .status(200)
      .json(new ApiResponse(201, urls, "urls fetched suuccessfully"));
  }
});

const generateCustomUrl = asyncHandler(async (req, res) => {
  const { originalUrl, backhalf, expiredIn } = req.body;
  const { domainId } = req.params;

  if (!originalUrl) {
    throw new ApiError(422, "URL can't be empty");
  }
  if (!domainId) {
    throw new ApiError(422, "Domain ID is required");
  }

  const domain = await Domain.findById(domainId);
  if (!domain) {
    throw new ApiError(422, "Domain not found");
  }

  if (!domain.isDomainVerified) {
    throw new ApiError(422, "please verify the domain first");
  }

  const urlId = nanoid(5);
  const generatedShortenUrl = `${process.env.BASE_URL}/${urlId}`;

  let brandedShortenUrl;
  if (backhalf) {
    brandedShortenUrl = `${domain.url}/${backhalf}`;
  } else {
    brandedShortenUrl = `${domain.url}/${urlId}`;
  }

  const metadata = await getMetaData(originalUrl);
  if (!metadata) {
    throw new ApiError(500, "Something went wrong while fetching the metadata");
  }

  const saveUrl = await Url.create({
    urlId,
    originalUrl,
    shortenUrl: generatedShortenUrl,
    customUrl: brandedShortenUrl,
    expiredIn,
    logo:
      metadata.icon ||
      `https://ui-avatars.com/api/?name=${metadata.title}&background=random&color=fff`,
    isLoggedIn: true,
    domainId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, saveUrl, "URL shortened successfully"));
});

const getUrlsByDomain = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const { domainId } = req.params;

  const domain = await Domain.findById(domainId);
  if (!domain) {
    throw new ApiError(422, "Domain not found");
  }
  if (domain.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this domain");
  }

  const urlsAggregate = Url.aggregate([
    {
      $match: {
        domainId: new mongoose.Types.ObjectId(domainId),
      },
    },
  ]);

  if (!urlsAggregate) {
    throw new ApiError(500, "something went wrong while fetching urls");
  }

  const urls = await Url.aggregatePaginate(
    urlsAggregate,
    getMongoosePaginationOptions({
      page,
      limit,
      customLabels: {
        totalDocs: "urlCount",
        docs: "urls",
      },
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, urls, "urls fetched successfully"));
});

export {
  generateShortUrl,
  redirectUrl,
  generateQrCode,
  deleteShortUrl,
  updateBackHalf,
  customDomain,
  getUserUrls,
  linkAnalytics,
  sevenDaysClickAnalytics,
  urlDetails,
  searchUrls,
  generateCustomUrl,
  getUrlsByDomain,
};
