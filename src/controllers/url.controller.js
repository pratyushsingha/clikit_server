import { nanoid } from "nanoid";
import QRCode from "qrcode";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Url } from "../../models/url.model.js";

const generateShortUrl = asyncHandler(async (req, res) => {
  const { originalUrl } = req.body;
  if (!originalUrl) throw new ApiError(422, "url can't be empty");

  const urlId = nanoid(5);

  const shortenUrl = `${process.env.BASE_URL}/${urlId}`;
  console.log(shortenUrl);
  if (!shortenUrl)
    throw new ApiError(500, "something went wrong while looming the url");

  const generateUrl = await Url.create({
    urlId,
    originalUrl,
    shortenUrl,
    isLoggedIn: req?.user?._id ? true : false,
    owner: req?.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, generateUrl, "url shorten successfully"));
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

  return res
    .status(201)
    .json(new ApiResponse(200, qrcode, "qr code generated successfully"));
});

export { generateShortUrl, redirectUrl, generateQrCode };
