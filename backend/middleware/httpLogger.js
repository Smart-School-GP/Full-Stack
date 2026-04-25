const logger = require('../lib/logger');

/**
 * Structured HTTP request/response logger.
 * Logs method, path, status, duration, and requestId on every response.
 * Excludes the /health endpoint to avoid noise.
 */
function httpLogger(req, res, next) {
  if (req.path === '/health') return next();

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('HTTP request', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      durationMs: duration,
      userId: req.user?.id,
      userRole: req.user?.role,
    });
  });

  next();
}

module.exports = httpLogger;
