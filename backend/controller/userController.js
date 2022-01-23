const asyncMiddleware = require('../middleware/asyncMiddleware');
const CustomError = require('../utils/CustomError');
const User = require('../models/userModel');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail.js');
const crypto = require('crypto');

//Register a User
exports.registerUser = asyncMiddleware(async (req, res, next) => {
  const { name, email, password } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: 'This is a sample id',
      url: 'profilpicUrl',
    },
  });

  sendToken(user, 201, res);
});

//Login User
exports.loginUser = asyncMiddleware(async (req, res, next) => {
  const { email, password } = req.body;

  //checking if user has given password and email both

  if (!email || !password) {
    return next(new CustomError('Please Enter Email & Password!', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new CustomError('Invalid Email or Password!', 401));
  }

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new CustomError('Invalid email or password!', 401));
  }

  sendToken(user, 200, res);
});

//Logout User
exports.logout = asyncMiddleware(async (req, res, next) => {
  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged Out',
  });
});

//Forgot Password
exports.forgotPassword = asyncMiddleware(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(CustomError('User not found', 404));
  }

  // Get resetPassword Token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;

  const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Ecommerce Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new CustomError(error.message, 500));
  }
});

//Reset Password
exports.resetPassword = asyncMiddleware(async (req, res, next) => {
  // Creating token hash
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(CustomError('Reset Password Token is invalid or has been expired', 400));
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(CustomError('Password does not password', 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(user, 200, res);
});

// Get User Details
exports.getUserDetails = asyncMiddleware(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

// Update User Password
exports.updatePassword = asyncMiddleware(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    return next(new CustomError('Old Password is Incorrect', 400));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new CustomError(`Password does not match`, 400));
  }

  user.password = req.body.newPassword;

  await user.save();

  sendToken(user, 200, res);
});

// Update User Profile
exports.updateProfile = asyncMiddleware(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  //We will add cloudinary later

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

//Get All User (admin)
exports.getAllUser = asyncMiddleware(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

//Get Single User (admin)
exports.getSingleUser = asyncMiddleware(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new CustomError(`User does not exist with Id: ${req.params.id}`));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// Update User Role --Admin
exports.updateUserRole = asyncMiddleware(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  //We will add cloudinary later

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

// Delete User --Admin
exports.deleteUser = asyncMiddleware(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  //We will remove cloudinary later

  if (!user) {
    return next(new CustomError(`User does not exist Id: ${req.params.id}`, 400));
  }

  await user.remove();

  res.status(200).json({
    success: true,
    message: 'User Deleted Successfully',
  });
});
