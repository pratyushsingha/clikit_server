import { nanoid, customAlphabet } from "nanoid";
import QRCode from "qrcode";
import getMetaData from "metadata-scraper";
import { promises as dnsPromises } from "dns";
import os from "node:os";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../../models/url.model.js";
import { Stat } from "../../models/stat.model.js";

const generateShortUrl = asyncHandler(async (req, res) => {
  const { originalUrl, expiresIn } = req.body;
  if (!originalUrl) throw new ApiError(422, "url can't be empty");

  const url = await Url.findOne({ originalUrl });
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
  
  await Stat.create({
    urlId: url._id,
    os: os.type(),
    device: os.machine(),
    $inc: { clicks: 1 },
    browser: req.headers["user-agent"],
  });

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
  if (!id) throw new ApiError(422, "url id is required");

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
      const dnsRecords = await dnsPromises.resolve(domain, "TXT");
      console.log(dnsRecords);
      const verify = dnsRecords.some((dnsRecord) =>
        dnsRecord.includes(veificationCode)
      );
      console.log(verify);
      // console.log("dns", dnsRecords);
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
        object;
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

export {
  generateShortUrl,
  redirectUrl,
  generateQrCode,
  deleteShortUrl,
  updateBackHalf,
  urlMetaData,
  customDomain,
};
