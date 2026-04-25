const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Sentry = require('@sentry/node');
const { globalLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimiters');
require('dotenv').config();

// Validate critical env vars at startup
if (process.env.NODE_ENV === 'production') {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl || !frontendUrl.startsWith('https://')) {
    console.error('[FATAL] FRONTEND_URL must be set to an https:// URL in production');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_secret') {
    console.error('[FATAL] JWT_SECRET must be set to a strong secret in production');
    process.exit(1);
  }
}

const requestId = require('./middleware/requestId');
const httpLogger = require('./middleware/httpLogger');
const logger = require('./lib/logger');
const { AppError } = require('./lib/errors');
const { queryLoggerMiddleware } = require('./middleware/queryLogger');
const { requireSchool } = require('./middleware/auth');


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
// Feature 2 & 3 (Academic Enhancements)
const visionAttendanceRoutes = require('./routes/visionAttendance');
const sentimentRoutes = require('./routes/sentiment');

const { startRiskCronJob } = require('./jobs/riskAnalysis');
const { startAnalyticsCronJob } = require('./jobs/analyticsGeneration');
const { startEventReminderCronJob } = require('./jobs/eventReminders');
const { startSentimentCronJob } = require('./jobs/sentimentAnalysis');

// ── Sentry init (before routes) ────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });
}

const { client, httpRequestDurationMicroseconds } = require('./lib/metrics');

const app = express();

// ── Allowed origins ────────────────────────────────────────────────────────────
const allowedOrigins = (() => {
  const origins = [];
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()));
  } else if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  } else {
    origins.push('http://localhost:3000');
  }
  return origins;
})();

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(requestId);
// Security headers. crossOriginResourcePolicy is relaxed because the Next.js
// frontend on a different origin needs to fetch API payloads (auth cookies
// are scoped by CORS already).
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);
app.use(queryLoggerMiddleware);
app.use(globalLimiter);


// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const prisma = require('./lib/prisma');
  const checks = {};
  let overall = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    overall = 'down';
  }

  try {
    const axios = require('axios');
    await axios.get(`${process.env.AI_SERVICE_URL || 'http://localhost:8002'}/health`, { timeout: 2000 });
    checks.aiService = 'ok';
  } catch {
    checks.aiService = 'error';
    if (overall !== 'down') overall = 'degraded';
  }

  res.status(overall === 'down' ? 503 : 200).json({ status: overall, checks, timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', requireSchool, adminRoutes);
app.use('/api/teacher', requireSchool, teacherRoutes);
app.use('/api/parent', requireSchool, parentRoutes);
app.use('/api/student', requireSchool, studentRoutes);
app.use('/api/meetings', requireSchool, meetingsRoutes);
app.use('/api/notifications', requireSchool, notificationsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/attendance', requireSchool, attendanceRoutes);
app.use('/api/announcements', requireSchool, announcementsRoutes);
app.use('/api/messages', requireSchool, messagesRoutes);
app.use('/api/submissions', requireSchool, submissionsRoutes);
app.use('/api/device-tokens', requireSchool, deviceTokensRoutes);
app.use('/api/export', requireSchool, exportRoutes);

// Phase 6
app.use('/api/learning-paths', requireSchool, learningPathsRoutes);
app.use('/api/discussions', requireSchool, discussionsRoutes);
app.use('/api/portfolio', requireSchool, portfolioRoutes);
app.use('/api/badges', requireSchool, badgesRoutes);
app.use('/api/xp', requireSchool, xpRoutes);
app.use('/api/timetable', requireSchool, timetableRoutes);
app.use('/api/events', requireSchool, eventsRoutes);
// Academic Enhancements (Features 2 & 3)
app.use('/api/vision', requireSchool, visionAttendanceRoutes);
app.use('/api/sentiment', requireSchool, sentimentRoutes);

// ── Metrics ──────────────────────────────────────────────────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Request duration middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;
    
    // Normalize route for metrics (e.g. /api/users/123 -> /api/users/:id)
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode)
      .observe(durationInSeconds);
  });
  next();
});

// ── Cron jobs ──────────────────────────────────────────────────────────────────
startRiskCronJob();
startAnalyticsCronJob();
startEventReminderCronJob();
startSentimentCronJob();

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

  // Unknown errors — log full stack, capture to Sentry, return generic message
  logger.error('Unhandled error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    schoolId: req.user?.school_id,
  });

  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('requestId', req.id);
      scope.setUser({ id: req.user?.id });
      Sentry.captureException(err);
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

module.exports = app;
