const cron = require('node-cron');
const axios = require('axios');
const Sentry = require('@sentry/node');

const {
  buildAnalyticsPayload,
  saveAnalyticsReport,
} = require('../services/analyticsAggregator');

const logger = require('../lib/logger');
const prisma = require("../lib/prisma");
const { cronLogger } = require('../middleware/queryLogger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8002';
const ANALYTICS_REQUEST_TIMEOUT_MS = 30000;

/**
 * Generate one analytics report. Returns the AnalyticsJob row id.
 */
async function runAnalytics(triggeredBy = 'cron') {
  const job = await prisma.analyticsJob.create({
    data: { status: 'processing', triggeredBy, startedAt: new Date() },
  });

  try {
    const payload = await buildAnalyticsPayload();

    const response = await axios.post(
      `${AI_SERVICE_URL}/generate/analytics`,
      payload,
      { timeout: ANALYTICS_REQUEST_TIMEOUT_MS }
    );

    await saveAnalyticsReport(
      response.data,
      payload.week_start,
      triggeredBy === 'cron' ? 'weekly' : 'manual'
    );

    await prisma.analyticsJob.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    logger.info('[AnalyticsJob] Completed', { jobId: job.id });
    return job.id;
  } catch (err) {
    await prisma.analyticsJob.update({
      where: { id: job.id },
      data: { status: 'failed', completedAt: new Date(), errorMessage: err.message },
    });
    logger.error('[AnalyticsJob] Failed', { jobId: job.id, error: err.message });
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    return job.id;
  }
}

async function runScheduledAnalytics() {
  const cronCtx = cronLogger.start('analytics_generation');
  try {
    await runAnalytics('cron');
    cronLogger.success(cronCtx);
  } catch (err) {
    cronLogger.failure(cronCtx, err);
    throw err;
  }
}

function startAnalyticsCronJob() {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  cron.schedule('0 23 * * 0', runScheduledAnalytics, { timezone });
  logger.info('[AnalyticsJob] Scheduled weekly analytics', { timezone });
}

module.exports = {
  startAnalyticsCronJob,
  runAnalytics,
  runAnalyticsForSchool: runAnalytics,
};
