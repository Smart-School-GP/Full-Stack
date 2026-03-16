const cron = require('node-cron');
const axios = require('axios');

const {
  buildAnalyticsPayload,
  saveAnalyticsReport,
  getAllSchools,
  getWeekStart,
} = require('../services/analyticsAggregator');

const prisma = require("../lib/prisma");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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

    console.log(`[AnalyticsJob] Completed for school ${schoolId} (job ${job.id})`);
    return job.id;
  } catch (err) {
    await prisma.analyticsJob.update({
      where: { id: job.id },
      data: { status: 'failed', completedAt: new Date(), errorMessage: err.message },
    });
    console.error(`[AnalyticsJob] Failed for school ${schoolId}:`, err.message);
    throw err;
  }
}

/**
 * Run analytics for all schools (cron / manual).
 */
async function runAnalyticsForAllSchools(triggeredBy = 'cron') {
  const schools = await getAllSchools();
  console.log(`[AnalyticsJob] Running for ${schools.length} schools`);
  for (const school of schools) {
    try {
      await runAnalyticsForSchool(school.id, triggeredBy);
    } catch {
      // Continue to next school even if one fails
    }
  }
}

function startAnalyticsCronJob() {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';

  // Every Sunday at 11pm
  cron.schedule('0 23 * * 0', () => runAnalyticsForAllSchools('cron'), { timezone });
  console.log(`[AnalyticsJob] Scheduled weekly analytics (timezone: ${timezone})`);
}

module.exports = { startAnalyticsCronJob, runAnalyticsForSchool };
