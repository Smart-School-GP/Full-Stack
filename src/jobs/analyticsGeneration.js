const cron = require('node-cron');
const axios = require('axios');
const Sentry = require('@sentry/node');

const {
  buildAnalyticsPayload,
  saveAnalyticsReport,
  getAllSchools,
  getWeekStart,
} = require('../services/analyticsAggregator');

const logger = require('../lib/logger');
const prisma = require("../lib/prisma");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8002';

/**
 * Run analytics generation for a single school.
 * Returns the job ID.
 */
async function runAnalyticsForSchool(schoolId, triggeredBy = 'cron') {
  // Create job record
  const job = await prisma.analyticsJob.create({
    data: { schoolId, status: 'processing', triggeredBy, startedAt: new Date() },
  });

  try {
    // Build data payload
    const payload = await buildAnalyticsPayload(schoolId);

    // Call FastAPI
    const response = await axios.post(
      `${AI_SERVICE_URL}/generate/analytics`,
      payload,
      { timeout: 30000 }
    );

    // Save results
    await saveAnalyticsReport(schoolId, response.data, payload.week_start, triggeredBy === 'cron' ? 'weekly' : 'manual');

    // Mark job done
    await prisma.analyticsJob.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    logger.info('[AnalyticsJob] Completed', { schoolId, jobId: job.id });
    return job.id;
  } catch (err) {
    await prisma.analyticsJob.update({
      where: { id: job.id },
      data: { status: 'failed', completedAt: new Date(), errorMessage: err.message },
    });
    logger.error('[AnalyticsJob] Failed', { schoolId, jobId: job.id, error: err.message });
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    return job.id;
  }
}

/**
 * Run analytics for all schools (cron / manual).
 */
async function runAnalyticsForAllSchools(triggeredBy = 'cron') {
  const schools = await getAllSchools();
  logger.info('[AnalyticsJob] Starting run', { schoolCount: schools.length, triggeredBy });
  for (const school of schools) {
    try {
      await runAnalyticsForSchool(school.id, triggeredBy);
    } catch (err) {
      logger.error('[AnalyticsJob] Unexpected error for school', { schoolId: school.id, error: err.message });
      if (process.env.SENTRY_DSN) Sentry.captureException(err);
    }
  }
}

function startAnalyticsCronJob() {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';

  // Every Sunday at 11pm
  cron.schedule('0 23 * * 0', () => runAnalyticsForAllSchools('cron'), { timezone });
  logger.info('[AnalyticsJob] Scheduled weekly analytics', { timezone });
}

module.exports = { startAnalyticsCronJob, runAnalyticsForSchool };
