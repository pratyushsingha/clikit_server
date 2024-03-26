import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: `${process.env.CLOUDINARY_CLOUD_NAME}`,
  api_key: `${process.env.CLOUDINARY_API_KEY}`,
  api_secret: `${process.env.CLOUDINARY_API_SECRET}`,
});

const cloudinaryUpload = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    // console.log("Upload successful:", response);
    return response;
  } catch (err) {
    console.error("Error uploading to Cloudinary:", err);
    fs.unlinkSync(localFilePath);

    throw err;
  }
};

export { cloudinaryUpload };
