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

const SENTIMENT_REQUEST_TIMEOUT_MS = 60000;
const MIN_POST_LENGTH = 5;

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

async function fetchRecentStudentPosts(cutoff) {
  const [threads, replies] = await Promise.all([
    prisma.discussionThread.findMany({
      where: { author: { role: 'student' }, createdAt: { gte: cutoff } },
      select: { id: true, authorId: true, body: true },
    }),
    prisma.discussionReply.findMany({
      where: { author: { role: 'student' }, createdAt: { gte: cutoff } },
      select: { id: true, authorId: true, body: true },
    }),
  ]);

  const posts = [
    ...threads.map((t) => ({ post_id: `thread:${t.id}`, author_id: t.authorId, text: stripHtml(t.body) })),
    ...replies.map((r) => ({ post_id: `reply:${r.id}`, author_id: r.authorId, text: stripHtml(r.body) })),
  ];

  return posts.filter((p) => p.text.trim().length > MIN_POST_LENGTH);
}

async function runSentimentAnalysis() {
  const cronCtx = cronLogger.start('sentiment_analysis');
  logger.info('[SentimentJob] Starting weekly sentiment analysis...');

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

    const posts = await fetchRecentStudentPosts(cutoff);
    if (posts.length === 0) {
      cronLogger.success(cronCtx);
      logger.info('[SentimentJob] No posts to analyze.');
      return;
    }

    const aiRes = await axios.post(
      `${AI_SERVICE_URL}/sentiment/analyze-posts`,
      { posts },
      { timeout: SENTIMENT_REQUEST_TIMEOUT_MS }
    );
    const { author_summaries } = aiRes.data;

    const studentIds = [...new Set(posts.map((p) => p.author_id))];
    const roomLinks = await prisma.studentRoom.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, roomId: true },
    });
    const studentRoomMap = new Map(roomLinks.map((l) => [l.studentId, l.roomId]));

    const now = new Date();
    for (const summary of author_summaries) {
      await prisma.studentSentiment.upsert({
        where: { studentId_weekOf: { studentId: summary.author_id, weekOf: cutoff } },
        create: {
          studentId: summary.author_id,
          roomId: studentRoomMap.get(summary.author_id) || null,
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
