const CustomError = require('../utils/CustomError');
const asyncMiddleware = require('./asyncMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.isAuthenticatedUser = asyncMiddleware(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new CustomError('Please login to access this resource', 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  req.user = await User.findById(decodedData.id);

  next();
});

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new CustomError(`Role: ${req.user.role} is not allowed to access this resource`, 403));
    }

    next();
  };
};
