const express = require('express');
const cors = require('cors');
require('dotenv').config();

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

const { startRiskCronJob } = require('./jobs/riskAnalysis');
const { startAnalyticsCronJob } = require('./jobs/analyticsGeneration');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
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

// Start nightly risk analysis cron job
startRiskCronJob();
// Start weekly analytics generation cron job
startAnalyticsCronJob();

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
