/**
 * Sentiment Analysis Cron Job
 * Runs weekly to analyze all recent discussion posts and persist
 * per-student sentiment records for trend tracking.
 */

const cron = require('node-cron');
const axios = require('axios');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { cronLogger } = require('../middleware/queryLogger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8002';
const LOOKBACK_DAYS = 7;

async function runSentimentAnalysis() {
  const cronCtx = cronLogger.start('sentiment_analysis');
  logger.info('[SentimentJob] Starting weekly sentiment analysis...');

  try {
    const schools = await prisma.school.findMany({ select: { id: true, name: true } });

    for (const school of schools) {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

        // Get all student discussion activity for this school
        const [threads, replies] = await Promise.all([
          prisma.discussionThread.findMany({
            where: {
              board: { schoolId: school.id },
              author: { role: 'student', schoolId: school.id },
              createdAt: { gte: cutoff },
            },
            select: { id: true, authorId: true, body: true },
          }),
          prisma.discussionReply.findMany({
            where: {
              thread: { board: { schoolId: school.id } },
              author: { role: 'student', schoolId: school.id },
              createdAt: { gte: cutoff },
            },
            select: { id: true, authorId: true, body: true },
          }),
        ]);

        const posts = [
          ...threads.map((t) => ({
            post_id: `thread:${t.id}`,
            author_id: t.authorId,
            text: t.body.replace(/<[^>]+>/g, ''),
          })),
          ...replies.map((r) => ({
            post_id: `reply:${r.id}`,
            author_id: r.authorId,
            text: r.body.replace(/<[^>]+>/g, ''),
          })),
        ].filter((p) => p.text.trim().length > 5);

        if (posts.length === 0) continue;

        // Call AI service
        const aiRes = await axios.post(
          `${AI_SERVICE_URL}/sentiment/analyze-posts`,
          { posts },
          { timeout: 60000 }
        );

        const { author_summaries } = aiRes.data;

        // Get the students' class IDs for context
        const studentIds = [...new Set(posts.map((p) => p.author_id))];
        const classLinks = await prisma.studentClass.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true, classId: true },
        });
        const studentClassMap = new Map(classLinks.map((l) => [l.studentId, l.classId]));

        // Persist per-student sentiment records
        const now = new Date();
        for (const summary of author_summaries) {
          await prisma.studentSentiment.upsert({
            where: {
              schoolId_studentId_weekOf: {
                schoolId: school.id,
                studentId: summary.author_id,
                weekOf: cutoff,
              },
            },
            create: {
              schoolId: school.id,
              studentId: summary.author_id,
              classId: studentClassMap.get(summary.author_id) || null,
              sentimentScore: summary.avg_sentiment_score,
              label: summary.dominant_sentiment,
              postCount: summary.post_count,
              calculatedAt: now,
              weekOf: cutoff,
            },
            update: {
              sentimentScore: summary.avg_sentiment_score,
              label: summary.dominant_sentiment,
              postCount: summary.post_count,
              calculatedAt: now,
            },
          });
        }

        logger.info(`[SentimentJob] Processed ${posts.length} posts for school ${school.id}`);
      } catch (schoolErr) {
        logger.error(`[SentimentJob] Error for school ${school.id}:`, { error: schoolErr.message });
      }
    }

    cronLogger.success(cronCtx);
    logger.info('[SentimentJob] Weekly sentiment analysis complete.');
  } catch (err) {
    logger.error('[SentimentJob] Fatal error:', { error: err.message });
    cronLogger.failure(cronCtx, err);
  }
}

function startSentimentCronJob() {
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  // Every Sunday at 3 AM
  cron.schedule('0 3 * * 0', runSentimentAnalysis, { timezone });
  logger.info('[SentimentJob] Scheduled weekly sentiment analysis at Sunday 03:00 AM');
  return runSentimentAnalysis;
}

module.exports = { startSentimentCronJob, runSentimentAnalysis };
