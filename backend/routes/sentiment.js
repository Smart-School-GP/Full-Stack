/**
 * Sentiment Analysis Routes
 * Analyzes student discussion posts using NLP to surface engagement insights.
 *
 * GET /api/sentiment/room/:roomId       — aggregate sentiment for a room's recent discussions
 * GET /api/sentiment/student/:studentId   — sentiment history for a specific student
 * POST /api/sentiment/trigger             — manually trigger sentiment analysis (admin)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8002';
const LOOKBACK_DAYS = 14; // Analyze posts from the last 14 days

router.use(authenticate);

/**
 * GET /api/sentiment/room/:roomId
 * Get aggregated sentiment for all students in a room based on recent discussion posts.
 */
router.get('/room/:roomId', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    // Verify room belongs to this school
    const cls = await prisma.room.findFirst({
      where: { id: req.params.roomId },
      include: { students: { include: { student: { select: { id: true, name: true } } } } },
    });
    if (!cls) return res.status(404).json({ error: 'Room not found' });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

    // Get all discussion posts for subjects of this room
    const subjects = await prisma.subject.findMany({
      where: { roomId: req.params.roomId },
      select: { id: true },
    });
    const subjectIds = subjects.map((s) => s.id);

    const boards = await prisma.discussionBoard.findMany({
      where: { subjectId: { in: subjectIds } },
      select: { id: true },
    });
    const boardIds = boards.map((b) => b.id);

    // Fetch threads and replies authored by students in this room
    const studentIds = new Set(cls.students.map((sc) => sc.studentId));

    const [threads, replies] = await Promise.all([
      prisma.discussionThread.findMany({
        where: {
          boardId: { in: boardIds },
          authorId: { in: [...studentIds] },
          createdAt: { gte: cutoff },
        },
        select: { id: true, authorId: true, body: true },
      }),
      prisma.discussionReply.findMany({
        where: {
          thread: { boardId: { in: boardIds } },
          authorId: { in: [...studentIds] },
          createdAt: { gte: cutoff },
        },
        select: { id: true, authorId: true, body: true },
      }),
    ]);

    // Combine posts, strip HTML tags
    const posts = [
      ...threads.map((t) => ({ post_id: `thread:${t.id}`, author_id: t.authorId, text: t.body.replace(/<[^>]+>/g, '') })),
      ...replies.map((r) => ({ post_id: `reply:${r.id}`, author_id: r.authorId, text: r.body.replace(/<[^>]+>/g, '') })),
    ].filter((p) => p.text.trim().length > 5);

    if (posts.length === 0) {
      return res.json({
        room_id: req.params.roomId,
        room_name: cls.name,
        lookback_days: LOOKBACK_DAYS,
        students: cls.students.map((sc) => ({
          student_id: sc.studentId,
          student_name: sc.student.name,
          post_count: 0,
          avg_sentiment_score: 0,
          dominant_sentiment: 'NEUTRAL',
        })),
        total_posts: 0,
        overall_sentiment: 'NEUTRAL',
      });
    }

    // Call AI service
    const aiRes = await axios.post(
      `${AI_SERVICE_URL}/sentiment/analyze-posts`,
      { posts },
      { timeout: 30000 }
    );

    const { author_summaries, overall_sentiment, total_posts } = aiRes.data;

    // Map author summaries back to student names
    const authorMap = new Map(author_summaries.map((a) => [a.author_id, a]));
    const studentMap = new Map(cls.students.map((sc) => [sc.studentId, sc.student.name]));

    const students = cls.students.map((sc) => {
      const summary = authorMap.get(sc.studentId);
      return {
        student_id: sc.studentId,
        student_name: sc.student.name,
        post_count: summary?.post_count || 0,
        positive_count: summary?.positive_count || 0,
        negative_count: summary?.negative_count || 0,
        neutral_count: summary?.neutral_count || 0,
        avg_sentiment_score: summary?.avg_sentiment_score || 0,
        dominant_sentiment: summary?.dominant_sentiment || 'NEUTRAL',
      };
    });

    // Sort by most negative first (teachers need to see struggling students first)
    students.sort((a, b) => a.avg_sentiment_score - b.avg_sentiment_score);

    res.json({
      room_id: req.params.roomId,
      room_name: cls.name,
      lookback_days: LOOKBACK_DAYS,
      students,
      total_posts,
      overall_sentiment,
    });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({ error: err.response.data?.detail || 'AI service error' });
    }
    logger.error('sentiment:room:error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sentiment/student/:studentId
 * Get a student's stored sentiment history from the database.
 */
router.get('/student/:studentId', requireRole('teacher', 'admin', 'parent'), async (req, res) => {
  try {
    // Parents can only see their own children
    if (req.user.role === 'parent') {
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: req.user.id, studentId: req.params.studentId },
      });
      if (!link) return res.status(403).json({ error: 'Access denied' });
    }

    const records = await prisma.studentSentiment.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { calculatedAt: 'desc' },
      take: 30,
    });

    const student = await prisma.user.findFirst({
      where: { id: req.params.studentId },
      select: { id: true, name: true },
    });

    res.json({ student, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
