const logger = require('../lib/logger');

/**
 * Middleware to log slow database queries (>100ms)
 * Add this middleware after Prisma is initialized to track query performance
 */
function queryLoggerMiddleware(req, res, next) {
  const start = process.hrtime();

  // Log query timing when response finishes
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1000) + (diff[1] / 1000000);

    if (durationMs > 100) {
      logger.warn('slow_query_detected', {
        method: req.method,
        path: req.route?.path || req.path,
        durationMs: Math.round(durationMs),
        userId: req.user?.id,
        schoolId: req.user?.school_id,
      });
    }
  });

  next();
}

/**
 * Log cron job execution with start, success, failure, and duration
 */
const cronLogger = {
  start: (jobName, schoolId) => {
    const timestamp = new Date().toISOString();
    logger.info(`cron:${jobName}:start`, { jobName, schoolId, timestamp });
    return { startTime: Date.now(), jobName, schoolId, timestamp };
  },

  success: (context) => {
    const duration = Date.now() - context.startTime;
    logger.info(`cron:${context.jobName}:success`, {
      jobName: context.jobName,
      schoolId: context.schoolId,
      duration,
      timestamp: new Date().toISOString(),
    });
  },

  failure: (context, error) => {
    const duration = Date.now() - context.startTime;
    logger.error(`cron:${context.jobName}:failure`, {
      jobName: context.jobName,
      schoolId: context.schoolId,
      error: error.message,
      duration,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = { queryLoggerMiddleware, cronLogger };