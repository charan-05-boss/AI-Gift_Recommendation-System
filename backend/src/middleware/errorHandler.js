/**
 * Global Error Handler Middleware.
 *
 * Catches all errors thrown in route handlers and returns
 * clean, consistent JSON error responses.
 */

function errorHandler(err, req, res, _next) {
  // Log the full error server-side for debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build response
  const response = {
    success: false,
    error: err.message || 'Internal server error.',
  };

  // In development, include the stack trace
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Custom application error class.
 * Allows throwing errors with a specific HTTP status code.
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Wrap an async route handler to automatically catch errors
 * and forward them to the error handler middleware.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, AppError, asyncHandler };
