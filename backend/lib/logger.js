const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, simple } = format;

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Structured JSON logger (Winston).
 *
 * - In development: human-readable colorized output
 * - In production: JSON lines with timestamp + stack trace support
 *
 * Usage:
 *   const logger = require('./lib/logger');
 *   logger.info('User created', { userId });
 *   logger.error('DB error', { error: err.message, requestId });
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true })
  ),
  transports: [
    new transports.Console({
      format: isDev
        ? combine(colorize(), simple())
        : combine(json()),
    }),
  ],
  // Never crash the process on logger errors
  exitOnError: false,
});

module.exports = logger;
