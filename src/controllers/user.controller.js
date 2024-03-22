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
    const { fullName, email, username, password, tags, bio } = req.body;
    if (
      [fullName, email, username, password].some((field) => field?.trim === "")
    ) {
      throw new ApiError(400, "all fields are required");
    }
  
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
  
    if (existingUser) {
      throw new ApiError(409, "user with this email or username already exists");
    }
    console.log(req.files);
  
    let avatarLocalPath, coverImageLocalPath;
  
    if (
      req.files &&
      Array.isArray(req.files.avatar) &&
      req.files.avatar.length > 0
    ) {
      avatarLocalPath = req.files.avatar[0].path;
    }
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }
  
    let tag = tags?.split(" ");
  
    const avatar = await cloudinaryUpload(avatarLocalPath);
    const coverImage = await cloudinaryUpload(coverImageLocalPath);
    console.log(avatar);
    const user = await User.create({
      fullName,
      username,
      email,
      password,
      avatar:
        avatar?.url ||
        `https://ui-avatars.com/api/?name=${fullName}&background=random&color=fff`,
      coverImage: coverImage?.url || "https://shorturl.at/oKNUV",
      tags: tag,
      bio,
    });
  
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
  
    if (!createdUser) {
      throw new ApiError(500, "something went wrong while registering the user");
    }
  
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "user created successfully"));
  });
  
  const loginUser = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;
    if (!(username || email)) {
      throw new ApiError(400, "username or email is required");
    }
    const user = await User.findOne({
      $or: [{ email }, { username }],
    });
  
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
  