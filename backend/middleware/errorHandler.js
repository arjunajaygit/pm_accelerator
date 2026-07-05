/**
 * Global error handling middleware for Express.
 * Catches unhandled errors and returns structured JSON responses.
 */

function errorHandler(err, req, res, next) {
  console.error('[AtmosphereAI Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      type: 'VALIDATION_ERROR',
      message: 'Data validation failed.',
      details: messages
    });
  }

  // Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      type: 'INVALID_ID',
      message: 'The provided record ID is not valid.'
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      status: 'error',
      type: 'DUPLICATE_KEY',
      message: 'A record with this data already exists.'
    });
  }

  // Axios errors (upstream API failures)
  if (err.isAxiosError) {
    const status = err.response?.status || 502;
    const upstream = err.config?.url ? new URL(err.config.url).hostname : 'unknown';
    return res.status(status >= 500 ? 502 : status).json({
      status: 'error',
      type: 'UPSTREAM_API_ERROR',
      message: `Failed to communicate with external service (${upstream}).`,
      details: err.response?.data?.message || err.message
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    type: 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
