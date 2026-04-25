const cron = require('node-cron');
const Sentry = require('@sentry/node');
const logger = require('../lib/logger');
const { cronLogger } = require('../middleware/queryLogger');
const {
  buildRiskFeatures,
  getPredictions,
  saveRiskScores,
  createRiskNotifications,
} = require('../services/aiService');

let isRunning = false;

async function runRiskAnalysis() {
  if (isRunning) {
    logger.debug('[RiskJob] Already running, skipping.');
    return;
  }
  isRunning = true;
  const cronCtx = cronLogger.start('risk_analysis');
  logger.info('[RiskJob] Starting risk analysis');

  try {
    // 1. Build feature vectors for all students
    const features = await buildRiskFeatures();
    logger.debug('[RiskJob] Features built', { count: features.length });

    if (features.length === 0) {
      logger.info('[RiskJob] No data to analyze.');
      cronLogger.success(cronCtx);
      return;
    }

    // 2. Get predictions from FastAPI (or fallback)
    const predictions = await getPredictions(features);
    logger.debug('[RiskJob] Predictions received', { count: predictions.length });

    // 3. Save to DB
    await saveRiskScores(predictions);

    // 4. Create notifications for high-risk
    await createRiskNotifications(predictions);

    const highCount = predictions.filter((p) => p.risk_level === 'high').length;
    const medCount = predictions.filter((p) => p.risk_level === 'medium').length;
    logger.info('[RiskJob] Completed risk analysis', { 
      durationMs: Date.now() - cronCtx.startTime, 
      highRiskCount: highCount, 
      mediumRiskCount: medCount 
    });
    cronLogger.success(cronCtx);
  } catch (err) {
    logger.error('[RiskJob] Fatal error during analysis', { error: err.message, stack: err.stack });
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    cronLogger.failure(cronCtx, err);
  } finally {
    isRunning = false;
  }
}

function startRiskCronJob() {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';

  // Run every night at midnight
  cron.schedule('0 0 * * *', runRiskAnalysis, { timezone });
  logger.info('[RiskJob] Scheduled nightly risk analysis', { timezone });

  // Also expose manual trigger for testing
  return runRiskAnalysis;
}

module.exports = { startRiskCronJob, runRiskAnalysis };
