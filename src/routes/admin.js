const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const { buildAnalyticsPayload, saveAnalyticsReport, getWeekStart } = require('../services/analyticsAggregator');
const { runAnalyticsForSchool } = require('../jobs/analyticsGeneration');

const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(authenticate, requireRole('admin'));

// POST /api/admin/schools — Create a new school (super-admin use, no school_id check needed)
router.post('/schools', async (req, res) => {
  try {
    const { name, city, country } = req.body;
    if (!name) return res.status(400).json({ error: 'School name is required' });

    const school = await prisma.school.create({ data: { name, city, country } });
    res.status(201).json(school);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — Create user within the admin's school
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, role are required' });
    }

    const validRoles = ['teacher', 'parent', 'student', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        schoolId: req.user.school_id,
        name,
        email,
        passwordHash,
        role,
      },
      select: { id: true, name: true, email: true, role: true, schoolId: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — List all users in the admin's school
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { schoolId: req.user.school_id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.userId, schoolId: req.user.school_id },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.user.delete({ where: { id: req.params.userId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/classes — Create a class
router.post('/classes', async (req, res) => {
  try {
    const { name, grade_level } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name is required' });

    const cls = await prisma.class.create({
      data: { schoolId: req.user.school_id, name, gradeLevel: grade_level },
    });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/classes — List classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.user.school_id },
      include: {
        _count: { select: { students: true, subjects: true } },
        teachers: { include: { teacher: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/classes/:classId/students — Enroll a student
router.post('/classes/:classId/students', async (req, res) => {
  try {
    const { student_id } = req.body;

    // Verify class belongs to school
    const cls = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    // Verify student belongs to school
    const student = await prisma.user.findFirst({
      where: { id: student_id, schoolId: req.user.school_id, role: 'student' },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.studentClass.upsert({
      where: { studentId_classId: { studentId: student_id, classId: req.params.classId } },
      create: { studentId: student_id, classId: req.params.classId },
      update: {},
    });

    res.status(201).json({ message: 'Student enrolled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/classes/:classId/teachers — Assign a teacher
router.post('/classes/:classId/teachers', async (req, res) => {
  try {
    const { teacher_id } = req.body;

    const cls = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const teacher = await prisma.user.findFirst({
      where: { id: teacher_id, schoolId: req.user.school_id, role: 'teacher' },
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    await prisma.teacherClass.upsert({
      where: { teacherId_classId: { teacherId: teacher_id, classId: req.params.classId } },
      create: { teacherId: teacher_id, classId: req.params.classId },
      update: {},
    });

    res.status(201).json({ message: 'Teacher assigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/parent-student — Link parent to student
router.post('/parent-student', async (req, res) => {
  try {
    const { parent_id, student_id } = req.body;

    const parent = await prisma.user.findFirst({
      where: { id: parent_id, schoolId: req.user.school_id, role: 'parent' },
    });
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    const student = await prisma.user.findFirst({
      where: { id: student_id, schoolId: req.user.school_id, role: 'student' },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parent_id, studentId: student_id } },
      create: { parentId: parent_id, studentId: student_id },
      update: {},
    });

    res.status(201).json({ message: 'Parent-student relationship created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/school — School-wide performance
router.get('/reports/school', async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const totalStudents = await prisma.user.count({
      where: { schoolId, role: 'student' },
    });

    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          include: {
            student: {
              include: {
                finalGrades: true,
              },
            },
          },
        },
        subjects: true,
      },
    });

    const classAverages = classes.map((cls) => {
      const allGrades = cls.students.flatMap((sc) =>
        sc.student.finalGrades.map((fg) => fg.finalScore).filter((s) => s !== null)
      );
      const avg =
        allGrades.length > 0
          ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length
          : null;
      return { class_id: cls.id, class_name: cls.name, average: avg, student_count: cls.students.length };
    });

    // At-risk students: final grade < 50 in any subject
    const atRiskData = await prisma.finalGrade.findMany({
      where: {
        finalScore: { lt: 50 },
        student: { schoolId },
      },
      include: {
        student: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    const atRiskMap = {};
    for (const fg of atRiskData) {
      if (!atRiskMap[fg.studentId]) {
        atRiskMap[fg.studentId] = { student: fg.student, failing_subjects: [] };
      }
      atRiskMap[fg.studentId].failing_subjects.push({
        subject: fg.subject.name,
        score: fg.finalScore,
      });
    }

    res.json({
      total_students: totalStudents,
      class_averages: classAverages,
      at_risk_students: Object.values(atRiskMap),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/risk-overview — School-wide risk summary
router.get('/risk-overview', async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const allRisk = await prisma.riskScore.findMany({
      where: { student: { schoolId } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentClasses: { include: { class: { select: { id: true, name: true } } } },
          },
        },
        subject: { select: { name: true } },
      },
    });

    const high = allRisk.filter((r) => r.riskLevel === 'high');
    const medium = allRisk.filter((r) => r.riskLevel === 'medium');

    const classMap = {};
    for (const r of allRisk) {
      if (r.riskLevel === 'low') continue;
      for (const sc of r.student.studentClasses) {
        const cid = sc.class.id;
        if (!classMap[cid]) classMap[cid] = { class_name: sc.class.name, at_risk_count: 0 };
        classMap[cid].at_risk_count++;
      }
    }

    res.json({
      total_at_risk: high.length + medium.length,
      high_risk: high.length,
      medium_risk: medium.length,
      by_class: Object.values(classMap),
      top_at_risk: high.slice(0, 10).map((r) => ({
        student_id: r.studentId,
        student_name: r.student.name,
        subject_name: r.subject.name,
        risk_score: r.riskScore,
        calculated_at: r.calculatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ANALYTICS ENDPOINTS ──────────────────────────────────────────────────────

// GET /api/admin/analytics/latest — most recent report for this school
router.get('/analytics/latest', async (req, res) => {
  try {
    const report = await prisma.analyticsReport.findFirst({
      where: { schoolId: req.user.school_id },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) return res.json({ report: null });

    res.json({
      report: {
        id: report.id,
        generated_at: report.generatedAt,
        week_start: report.weekStart,
        report_type: report.reportType,
        school_summary: report.schoolSummary,
        at_risk_summary: report.atRiskSummary,
        recommended_actions: JSON.parse(report.recommendedActions || '[]'),
        subject_insights: JSON.parse(report.subjectInsightsJson || '[]'),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/analytics/refresh — trigger new report generation
router.post('/analytics/refresh', async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    // Check if a job is already running
    const running = await prisma.analyticsJob.findFirst({
      where: { schoolId, status: { in: ['pending', 'processing'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (running) {
      return res.json({ job_id: running.id, status: running.status, message: 'Job already running' });
    }

    // Create a pending job immediately so the client can poll
    const job = await prisma.analyticsJob.create({
      data: { schoolId, status: 'pending', triggeredBy: 'admin', startedAt: new Date() },
    });

    // Fire and forget — run in background
    runAnalyticsForSchool(schoolId, 'admin').catch((err) =>
      console.error('[Analytics] Background job error:', err.message)
    );

    res.json({ job_id: job.id, status: 'processing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/jobs/:jobId — poll job status
router.get('/analytics/jobs/:jobId', async (req, res) => {
  try {
    const job = await prisma.analyticsJob.findFirst({
      where: { id: req.params.jobId, schoolId: req.user.school_id },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      job_id: job.id,
      status: job.status,
      triggered_by: job.triggeredBy,
      started_at: job.startedAt,
      completed_at: job.completedAt,
      error_message: job.errorMessage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/subjects — Chart.js-ready subject data
router.get('/analytics/subjects', async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const insights = await prisma.subjectInsight.findMany({
      where: { schoolId },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: { generatedAt: 'desc' },
    });

    // Deduplicate by subject+class (keep latest)
    const seen = new Set();
    const unique = insights.filter((i) => {
      const key = `${i.subjectId}-${i.classId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      labels: unique.map((i) => `${i.subject.name} (${i.class.name})`),
      averages: unique.map((i) => i.averageScore ?? 0),
      trends: unique.map((i) => i.trend),
      insights: unique.map((i) => ({
        subject_name: i.subject.name,
        class_name: i.class.name,
        insight_text: i.insightText,
        average_score: i.averageScore,
        trend: i.trend,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
