
function errorHandler(err, req, res, next) {
  console.error('[ATMOSPHERE Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      type: 'VALIDATION_ERROR',
      message: 'Data validation failed.',
      details: messages
    });
  }

  
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      type: 'INVALID_ID',
      message: 'The provided record ID is not valid.'
    });
  }

  
  if (err.code === 11000) {
    return res.status(409).json({
      status: 'error',
      type: 'DUPLICATE_KEY',
      message: 'A record with this data already exists.'
    });
  }

  
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

  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    type: 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
