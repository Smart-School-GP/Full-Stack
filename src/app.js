const express = require('express');
const cors = require('cors');
require('dotenv').config();

const requestId = require('./middleware/requestId');
const httpLogger = require('./middleware/httpLogger');
const logger = require('./lib/logger');
const { AppError } = require('./lib/errors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const parentRoutes = require('./routes/parent');
const studentRoutes = require('./routes/student');
const meetingsRoutes = require('./routes/meetings');
const notificationsRoutes = require('./routes/notifications');
const ownerRoutes = require('./routes/owner');
const attendanceRoutes = require('./routes/attendance');
const announcementsRoutes = require('./routes/announcements');
const messagesRoutes = require('./routes/messages');
const submissionsRoutes = require('./routes/submissions');
const deviceTokensRoutes = require('./routes/deviceTokens');
const exportRoutes = require('./routes/export');
// Phase 6
const learningPathsRoutes = require('./routes/learningPaths');
const discussionsRoutes = require('./routes/discussions');
const portfolioRoutes = require('./routes/portfolio');
const badgesRoutes = require('./routes/badges');
const xpRoutes = require('./routes/xp');
const timetableRoutes = require('./routes/timetable');
const eventsRoutes = require('./routes/events');

const { startRiskCronJob } = require('./jobs/riskAnalysis');
const { startAnalyticsCronJob } = require('./jobs/analyticsGeneration');

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(requestId);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(httpLogger);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/device-tokens', deviceTokensRoutes);
app.use('/api/export', exportRoutes);
// Phase 6
app.use('/api/learning-paths', learningPathsRoutes);
app.use('/api/discussions', discussionsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/xp', xpRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/events', eventsRoutes);

// ── Cron jobs ──────────────────────────────────────────────────────────────────
startRiskCronJob();
startAnalyticsCronJob();

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Known application errors — safe to surface
  if (err instanceof AppError) {
    logger.warn('Application error', {
      requestId: req.id,
      code: err.code,
      status: err.status,
      message: err.message,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      schoolId: req.user?.school_id,
    });

    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details?.length > 0 && { details: err.details }),
      },
    });
  }

  // Prisma unique constraint violation → 409
  if (err.code === 'P2002') {
    logger.warn('Prisma unique constraint violation', { requestId: req.id, path: req.path });
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Resource already exists' },
    });
  }

  // Prisma record not found → 404
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  }

  // Unknown errors — log full stack, return generic message (never leak internals)
  logger.error('Unhandled error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    schoolId: req.user?.school_id,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

module.exports = app;
