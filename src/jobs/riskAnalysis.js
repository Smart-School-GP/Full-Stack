const cron = require('node-cron');
const {
  buildRiskFeatures,
  getPredictions,
  saveRiskScores,
  createRiskNotifications,
} = require('../services/aiService');

let isRunning = false;

async function runRiskAnalysis() {
  if (isRunning) {
    console.log('[RiskJob] Already running, skipping.');
    return;
  }
  isRunning = true;
  const start = Date.now();
  console.log(`[RiskJob] Starting risk analysis at ${new Date().toISOString()}`);

  try {
    // 1. Build feature vectors for all students
    const features = await buildRiskFeatures();
    console.log(`[RiskJob] Built features for ${features.length} student-subject pairs`);

    if (features.length === 0) {
      console.log('[RiskJob] No data to analyze.');
      return;
    }

    // 2. Get predictions from FastAPI (or fallback)
    const predictions = await getPredictions(features);
    console.log(`[RiskJob] Got ${predictions.length} predictions`);

    // 3. Save to DB
    await saveRiskScores(predictions);

    // 4. Create notifications for high-risk
    await createRiskNotifications(predictions);

    const highCount = predictions.filter((p) => p.risk_level === 'high').length;
    const medCount = predictions.filter((p) => p.risk_level === 'medium').length;
    console.log(
      `[RiskJob] Done in ${Date.now() - start}ms. High: ${highCount}, Medium: ${medCount}`
    );
  } catch (err) {
    console.error('[RiskJob] Error:', err.message);
  } finally {
    isRunning = false;
  }
}

function startRiskCronJob() {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';

  // Run every night at midnight
  cron.schedule('0 0 * * *', runRiskAnalysis, { timezone });
  console.log(`[RiskJob] Scheduled nightly risk analysis (timezone: ${timezone})`);

  // Also expose manual trigger for testing
  return runRiskAnalysis;
}

module.exports = { startRiskCronJob, runRiskAnalysis };
