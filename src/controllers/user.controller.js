import { nanoid } from "nanoid";
import { Url } from "../../models/url.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { resend } from "../utils/resend.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "something went wrong while genetation access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  if ([fullName, email, password].some((field) => field?.trim === "")) {
    throw new ApiError(400, "all fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser)
    throw new ApiError(400, "user with this email already exists");

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  const avatar = await cloudinaryUpload(avatarLocalPath);

  const user = await User.create({
    fullName,
    email,
    password,
    avatar:
      avatar?.url ||
      `https://ui-avatars.com/api/?name=${fullName}&background=random&color=fff`,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(500, "something went wrong while registering the user");

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "user created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    throw new ApiError(400, "email is required");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "user doesn't exist");
  }
  const validatedPassword = await user.isPasswordCorrect(password);

  if (!validatedPassword) {
    throw new ApiError(401, "invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedinUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, {}, "logged out successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await cloudinaryUpload(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const currentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken -txtRecord"
  );
  if (!user) {
    new ApiError(404, "user not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "currentUser fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName } = req.body;
  if (!fullName) throw new ApiError(422, "fullName is required");

  const updateFullName = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
      },
    },
    { new: true }
  );

  if (!updateFullName) throw new ApiError(409, "user doesn't exits");

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        updateUserDetails,
        "userDetails updated successfully"
      )
    );
});

const authStatus = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.accessToken ||
    (req.headers && req.headers["Authorization"]?.replace("Bearer", ""));

  if (!token) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          isAuthenticated: false,
        },
        "user is not logged in"
      )
    );
  } else {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { isAuthenticated: true }, "user is logged in")
      );
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  const validatePassword = await user.isPasswordCorrect(oldPassword);

  if (!validatePassword) {
    throw new ApiError(401, "invalid user credentials");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "user created successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "Invalid email address");

  const resetToken = nanoid(32);
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

  try {
    const sendResetEmail = await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL,
      to: email,
      subject: "Reset your password",
      html: `<p>Hello, ${user.fullName}</p>
             <p>You requested to reset your password. Please click the link below to reset it:</p>
             <a href="${resetUrl}">Reset Password</a>
             <p>If you did not request this, please ignore this email.</p>`,
    });
    if (!sendResetEmail.error) {
      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 3600000;
      await user.save();
      return res
        .status(200)
        .json(
          new ApiResponse(200, {}, "Password reset link sent to your email")
        );
    }
  } catch (error) {
    throw new ApiError(500, "Error sending password reset email");
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({
    email,
    resetToken: token,
    resetTokenExpiry: { $lt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired reset token");

  user.password = password;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Password reset successfully"));
});

export {
  registerUser,
  loginUser,
  updateAvatar,
  logoutUser,
  currentUser,
  updateUserDetails,
  authStatus,
  changePassword,
  forgotPassword,
  resetPassword,
};
