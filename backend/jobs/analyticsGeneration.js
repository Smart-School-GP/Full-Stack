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

  // Execute the actual work in the background
  performAnalyticsBackground(job.id, triggeredBy).catch(err => {
    logger.error('[AnalyticsJob] Unhandled background error', { jobId: job.id, error: err.message });
  });

  return job.id;
}

/**
 * Internal background task
 */
async function performAnalyticsBackground(jobId, triggeredBy) {
  try {
    const payload = await buildAnalyticsPayload();
    let analyticsResult;

    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/generate/analytics`,
        payload,
        { timeout: ANALYTICS_REQUEST_TIMEOUT_MS }
      );
      analyticsResult = response.data;
    } catch (apiErr) {
      logger.warn('[AnalyticsJob] AI Service unreachable — using local fallback', { error: apiErr.message });
      analyticsResult = generateLocalFallbackAnalytics(payload);
    }

    await saveAnalyticsReport(
      analyticsResult,
      payload.week_start,
      triggeredBy === 'cron' ? 'weekly' : 'manual'
    );

    await prisma.analyticsJob.update({
      where: { id: jobId },
      data: { status: 'completed', completedAt: new Date() },
    });

    logger.info('[AnalyticsJob] Completed', { jobId });
  } catch (err) {
    await prisma.analyticsJob.update({
      where: { id: jobId },
      data: { status: 'failed', completedAt: new Date(), errorMessage: err.message },
    });
    logger.error('[AnalyticsJob] Failed', { jobId, error: err.message });
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
  }
}

/**
 * Fallback generator if AI service is offline.
 */
function generateLocalFallbackAnalytics(payload) {
  const avg = payload.overall_average_this_week || 0;
  const lastAvg = payload.overall_average_last_week || 0;
  const trend = avg >= lastAvg ? 'improving' : 'declining';
  
  const school_summary = `School performance is currently ${trend} with an overall average of ${avg.toFixed(1)}%. ${payload.total_rooms} active rooms are being monitored.`;
  
  const highRisk = payload.high_risk_count || 0;
  const at_risk_summary = highRisk > 0 
    ? `${highRisk} students are currently identified as high risk. Attention is required to improve engagement and submission rates.`
    : `No students are currently at high risk. Continue monitoring engagement levels.`;

  const recommended_actions = [
    'Review at-risk student list and schedule teacher consultations',
    'Verify all curriculum subjects have assigned teachers',
    'Monitor grade entry frequency across all rooms'
  ];

  const subject_insights = [];
  if (payload.rooms) {
    payload.rooms.forEach(room => {
      if (room.subjects) {
        room.subjects.forEach(sub => {
          subject_insights.push({
            subject_id: sub.subject_id,
            room_id: room.room_id,
            insight_text: `Average score for ${sub.subject_name} is ${sub.average_score.toFixed(1)}%.`,
            average_score: sub.average_score,
            trend: sub.average_score >= sub.average_last_week ? 'improving' : 'declining'
          });
        });
      }
    });
  }

  return {
    school_summary,
    at_risk_summary,
    recommended_actions,
    subject_insights
  };
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
