import logger from '../lib/logger.js';

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  // Log error with appropriate level based on error type
  const errorLog = {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  };

  // Default error
  let statusCode = 500;
  let message = 'Server error';

  // Handle specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    logger.warn('Validation error:', errorLog);
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
    logger.warn('Unauthorized error:', errorLog);
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
    logger.warn('Forbidden error:', errorLog);
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
    logger.warn('Not found error:', errorLog);
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = 'Resource conflict';
    logger.warn('Conflict error:', errorLog);
  } else {
    logger.error('Unhandled error:', errorLog);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Not found middleware
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.name = 'NotFoundError';
  logger.warn('Route not found:', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  next(error);
};

// Validation error class
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Unauthorized error class
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Forbidden error class
export class ForbiddenError extends Error {
  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Not found error class
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Conflict error class
export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
} 