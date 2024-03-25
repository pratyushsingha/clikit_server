import { nanoid } from "nanoid";
import QRCode from "qrcode";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../../models/url.model.js";

const generateShortUrl = asyncHandler(async (req, res) => {
  const { originalUrl } = req.body;
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
      isLoggedIn: req?.user?._id ? true : false,
      owner: req?.user?._id,
    });
  }
  generatedUrl = await Url.findByIdAndUpdate(
    url._id,
    {
      $set: {
        urlId,
        shortenUrl,
      },
    },
    { new: true }
  );

  return res
    .status(201)
    .json(new ApiResponse(200, generatedUrl, "url shorten successfully"));
});

const redirectUrl = asyncHandler(async (req, res) => {
  const { urlId } = req.params;

  const urlExists = await Url.findOne({ urlId });
  if (!urlExists) throw new ApiError(422, "url doesn't exists");

  await Url.updateOne(
    {
      urlId,
    },
    { $inc: { clicks: 1 } }
  );

  return res.redirect(urlExists.originalUrl);
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

export {
  generateShortUrl,
  redirectUrl,
  generateQrCode,
  deleteShortUrl,
  updateBackHalf,
};
