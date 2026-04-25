const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createUserSchema,
  createRoomSchema,
  enrollStudentSchema,
  assignTeacherSchema,
  linkParentStudentSchema,
  createSubjectSchema,
  updateSubjectSchema,
} = require('../schemas/admin.schemas');
const { runAnalyticsForSchool } = require('../jobs/analyticsGeneration');
const adminService = require('../services/adminService');

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

// All admin routes require auth + admin role + school context
router.use(authenticate, requireRole('admin'));

// ── Users ─────────────────────────────────────────────────────────────────────

// POST /api/admin/users — Create user within the admin's school
router.post('/users', validate(createUserSchema), async (req, res, next) => {
  try {
    const user = await adminService.createUser(req.body);
    logger.info('audit:user.create', { requestId: req.id, actorId: req.user.id, actorRole: req.user.role, newUserId: user.id, role: user.role });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — List all users in the admin's school
router.get('/users', async (req, res, next) => {
  try {
    const users = await adminService.listUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', async (req, res, next) => {
  try {
    const result = await adminService.deleteUser(req.params.userId);
    if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    logger.info('audit:user.delete', { requestId: req.id, actorId: req.user.id, actorRole: req.user.role, targetId: req.params.userId });
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    next(err);
  }
});

// ── Rooms ───────────────────────────────────────────────────────────────────

// POST /api/admin/rooms — Create a room
router.post('/rooms', validate(createRoomSchema), async (req, res, next) => {
  try {
    const cls = await adminService.createRoom({
      name: req.body.name,
      gradeLevel: req.body.grade_level,
    });
    res.status(201).json({ success: true, data: cls });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rooms — List rooms
router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await adminService.listRooms();
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rooms/:roomId — Get a single room
router.get('/rooms/:roomId', async (req, res, next) => {
  try {
    const cls = await adminService.getRoom(req.params.roomId);
    if (!cls) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found in your school' } });
    res.json({ success: true, data: cls });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rooms/:roomId/students — Enroll a student
router.post('/rooms/:roomId/students', validate(enrollStudentSchema), async (req, res, next) => {
  try {
    const result = await adminService.enrollStudent(req.params.roomId, req.body.student_id);
    if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room or Student not found' } });

    res.status(201).json({ success: true, data: { message: 'Student enrolled' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rooms/:roomId/students — List students in a room
router.get('/rooms/:roomId/students', async (req, res, next) => {
  try {
    const students = await adminService.listRoomStudents(req.params.roomId);
    if (students === null) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found in your school' } });

    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rooms/:roomId/teachers — Assign a teacher
router.post('/rooms/:roomId/teachers', validate(assignTeacherSchema), async (req, res, next) => {
  try {
    const result = await adminService.assignTeacher(req.params.roomId, req.body.teacher_id);
    if (!result) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room or Teacher not found' } });

    res.status(201).json({ success: true, data: { message: 'Teacher assigned' } });
  } catch (err) {
    next(err);
  }
});

// ── Subjects (admin-only management) ──────────────────────────────────────────

// GET /api/admin/rooms/:roomId/subjects — list subjects with assigned teacher
router.get('/rooms/:roomId/subjects', async (req, res, next) => {
  try {
    const subjects = await adminService.listRoomSubjects(req.params.roomId);
    if (subjects === null) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found in your school' } });

    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rooms/:roomId/subjects — create a subject and (optionally) assign a teacher
router.post('/rooms/:roomId/subjects', validate(createSubjectSchema), async (req, res, next) => {
  try {
    const result = await adminService.createSubject(req.params.roomId, {
      name: req.body.name,
      teacherId: req.body.teacher_id ?? null,
    });

    if (!result.ok) {
      if (result.code === 'CLASS_NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found in your school' } });
      if (result.code === 'TEACHER_NOT_IN_CLASS') return res.status(400).json({ success: false, error: { code: 'TEACHER_NOT_IN_CLASS', message: 'Teacher is not assigned to this room' } });
    }

    logger.info('audit:subject.create', { requestId: req.id, actorId: req.user.id, roomId: req.params.roomId, subjectId: result.data.id, teacherId: result.data.teacherId });
    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/subjects/:subjectId — rename and/or reassign teacher (teacher_id: null clears)
router.patch('/subjects/:subjectId', validate(updateSubjectSchema), async (req, res, next) => {
  try {
    const result = await adminService.updateSubject(req.params.subjectId, {
      name: req.body.name,
      teacherId: req.body.teacher_id, // may be undefined, null, or string
    });

    if (!result.ok) {
      if (result.code === 'SUBJECT_NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found in your school' } });
      if (result.code === 'TEACHER_NOT_IN_CLASS') return res.status(400).json({ success: false, error: { code: 'TEACHER_NOT_IN_CLASS', message: 'Teacher is not assigned to this room' } });
    }

    logger.info('audit:subject.update', { requestId: req.id, actorId: req.user.id, subjectId: req.params.subjectId, changes: req.body });
    res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/subjects/:subjectId
router.delete('/subjects/:subjectId', async (req, res, next) => {
  try {
    const ok = await adminService.deleteSubject(req.params.subjectId);
    if (!ok) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found in your school' } });

    logger.info('audit:subject.delete', { requestId: req.id, actorId: req.user.id, subjectId: req.params.subjectId });
    res.json({ success: true, data: { message: 'Subject deleted' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/parent-student — Link parent to student
router.post('/parent-student', validate(linkParentStudentSchema), async (req, res, next) => {
  try {
    const result = await adminService.linkParentStudent(req.body.parent_id, req.body.student_id);
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
    const report = await adminService.getSchoolReport();
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/risk-overview — School-wide risk summary
router.get('/risk-overview', async (req, res, next) => {
  try {
    const overview = await adminService.getRiskOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /api/admin/analytics/latest — most recent report for this school
router.get('/analytics/latest', async (req, res, next) => {
  try {
    const report = await adminService.getLatestAnalytics();
    res.json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/analytics/generate — manually trigger report (legacy alias)
router.post('/analytics/generate', async (req, res, next) => {
  try {
    const jobId = await runAnalyticsForSchool('admin');
    res.json({ success: true, data: { message: 'Analytics generation started.', job_id: jobId } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/analytics/refresh — trigger report (frontend alias)
router.post('/analytics/refresh', async (req, res, next) => {
  try {
    const jobId = await runAnalyticsForSchool('admin');
    res.json({ success: true, data: { job_id: jobId } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics/jobs/:jobId — check job status
router.get('/analytics/jobs/:jobId', async (req, res, next) => {
  try {
    const job = await prisma.analyticsJob.findFirst({
      where: { id: req.params.jobId },
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
    const data = await adminService.getSubjectAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
