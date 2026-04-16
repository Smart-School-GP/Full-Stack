const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createUserSchema,
  createClassSchema,
  enrollStudentSchema,
  assignTeacherSchema,
  linkParentStudentSchema,
} = require('../schemas/admin.schemas');
const { runAnalyticsForSchool } = require('../jobs/analyticsGeneration');
const adminService = require('../services/adminService');

const prisma = require('../lib/prisma');

// All admin routes require auth + admin role
router.use(authenticate, requireRole('admin'));

// ── Users ─────────────────────────────────────────────────────────────────────

// POST /api/admin/users — Create user within the admin's school
router.post('/users', validate(createUserSchema), async (req, res, next) => {
  try {
    const user = await adminService.createUser(req.user.school_id, req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — List all users in the admin's school
router.get('/users', async (req, res, next) => {
  try {
    const users = await adminService.listUsers(req.user.school_id);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', async (req, res, next) => {
  try {
    const result = await adminService.deleteUser(req.user.school_id, req.params.userId);
    if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    next(err);
  }
});

// ── Classes ───────────────────────────────────────────────────────────────────

// POST /api/admin/classes — Create a class
router.post('/classes', validate(createClassSchema), async (req, res, next) => {
  try {
    const cls = await adminService.createClass(req.user.school_id, {
      name: req.body.name,
      gradeLevel: req.body.grade_level,
    });
    res.status(201).json({ success: true, data: cls });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/classes — List classes
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await adminService.listClasses(req.user.school_id);
    res.json({ success: true, data: classes });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/classes/:classId — Get a single class
router.get('/classes/:classId', async (req, res, next) => {
  try {
    const cls = await adminService.getClass(req.user.school_id, req.params.classId);
    if (!cls) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found in your school' } });
    res.json({ success: true, data: cls });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/classes/:classId/students — Enroll a student
router.post('/classes/:classId/students', validate(enrollStudentSchema), async (req, res, next) => {
  try {
    const result = await adminService.enrollStudent(req.user.school_id, req.params.classId, req.body.student_id);
    if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class or Student not found' } });

    res.status(201).json({ success: true, data: { message: 'Student enrolled' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/classes/:classId/students — List students in a class
router.get('/classes/:classId/students', async (req, res, next) => {
  try {
    const students = await adminService.listClassStudents(req.user.school_id, req.params.classId);
    if (students === null) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found in your school' } });

    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/classes/:classId/teachers — Assign a teacher
router.post('/classes/:classId/teachers', validate(assignTeacherSchema), async (req, res, next) => {
  try {
    const result = await adminService.assignTeacher(req.user.school_id, req.params.classId, req.body.teacher_id);
    if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class or Teacher not found' } });

    res.status(201).json({ success: true, data: { message: 'Teacher assigned' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/parent-student — Link parent to student
router.post('/parent-student', validate(linkParentStudentSchema), async (req, res, next) => {
  try {
    const result = await adminService.linkParentStudent(req.user.school_id, req.body.parent_id, req.body.student_id);
    if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Parent or Student not found' } });

    res.status(201).json({ success: true, data: { message: 'Parent-student relationship created' } });
  } catch (err) {
    next(err);
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────

// GET /api/admin/reports/school — School-wide performance
router.get('/reports/school', async (req, res, next) => {
  try {
    const report = await adminService.getSchoolReport(req.user.school_id);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/risk-overview — School-wide risk summary
router.get('/risk-overview', async (req, res, next) => {
  try {
    const overview = await adminService.getRiskOverview(req.user.school_id);
    res.json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /api/admin/analytics/latest — most recent report for this school
router.get('/analytics/latest', async (req, res, next) => {
  try {
    const report = await prisma.analyticsReport.findFirst({
      where: { schoolId: req.user.school_id },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) return res.json({ success: true, data: { report: null } });

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/analytics/generate — manually trigger report (legacy alias)
router.post('/analytics/generate', async (req, res, next) => {
  try {
    const jobId = await runAnalyticsForSchool(req.user.school_id, 'admin');
    res.json({ success: true, data: { message: 'Analytics generation started.', job_id: jobId } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/analytics/refresh — trigger report (frontend alias)
router.post('/analytics/refresh', async (req, res, next) => {
  try {
    const jobId = await runAnalyticsForSchool(req.user.school_id, 'admin');
    res.json({ success: true, data: { job_id: jobId } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics/jobs/:jobId — check job status
router.get('/analytics/jobs/:jobId', async (req, res, next) => {
  try {
    const job = await prisma.analyticsJob.findFirst({
      where: { id: req.params.jobId, schoolId: req.user.school_id },
    });
    if (!job) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics/subjects — subject-level performance data
router.get('/analytics/subjects', async (req, res, next) => {
  try {
    const data = await adminService.getSubjectAnalytics(req.user.school_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
