const logger = require('../config/logger');

const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      name: 'ValidationError',
      message,
      statusCode: 404
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    error = {
      name: 'ValidationError',
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      name: 'AuthenticationError',
      message: 'Invalid token',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      name: 'AuthenticationError',
      message: 'Token expired',
      statusCode: 401
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      name: 'ValidationError',
      message: 'File size too large',
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      name: 'ValidationError',
      message: 'Too many files uploaded',
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = {
      name: 'RateLimitError',
      message: 'Too many requests, please try again later',
      statusCode: 429
    };
  }

  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Server Error';

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        name: err.name,
        stack: err.stack
      })
    }
  };

  // Add additional error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      originalError: err.message,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    };
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
