const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { recalculateFinalGrade, validateWeights } = require('../services/gradeCalculator');
const teacherService = require('../services/teacherService');
const {
  createSubjectSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  enterGradeSchema,
  updateGradeSchema,
  gradingWeightsSchema,
} = require('../schemas/teacher.schemas');

const prisma = require('../lib/prisma');

router.use(authenticate, requireRole('teacher'));

// ── Classes ───────────────────────────────────────────────────────────────────

// GET /api/teacher/classes
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await teacherService.listTeacherClasses(req.user.id);
    res.json({ success: true, data: classes });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/classes/:classId/students
router.get('/classes/:classId/students', async (req, res, next) => {
  try {
    const students = await teacherService.listClassStudents(req.user.school_id, req.user.id, req.params.classId);
    if (!students) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this class' } });

    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/classes/:classId/subjects
router.get('/classes/:classId/subjects', async (req, res, next) => {
  try {
    const subjects = await teacherService.listClassSubjects(req.user.id, req.params.classId);
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
});

// ── Subjects ──────────────────────────────────────────────────────────────────

// POST /api/teacher/subjects
router.post('/subjects', validate(createSubjectSchema), async (req, res, next) => {
  try {
    const { class_id, name } = req.body;
    const subject = await teacherService.createSubject(req.user.school_id, req.user.id, class_id, name);
    if (!subject) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });

    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/subjects/:subjectId/algorithm
router.put('/subjects/:subjectId/algorithm', validate(gradingWeightsSchema), async (req, res, next) => {
  try {
    const { weights } = req.body;
    try {
      validateWeights(weights);
    } catch (e) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: e.message } });
    }

    const algorithm = await teacherService.updateGradingAlgorithm(req.user.id, req.params.subjectId, weights);
    if (!algorithm) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found' } });

    res.json({ success: true, data: algorithm });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/subjects/:subjectId
router.get('/subjects/:subjectId', async (req, res, next) => {
  try {
    const subject = await teacherService.getSubjectDetail(req.user.id, req.params.subjectId);
    if (!subject) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found' } });

    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/subjects/:subjectId/analytics
router.get('/subjects/:subjectId/analytics', async (req, res, next) => {
  try {
    const analytics = await teacherService.getSubjectAnalytics(
      req.params.subjectId,
      req.user.id
    );
    if (!analytics) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found' } });
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

// ── Assignments ───────────────────────────────────────────────────────────────

// POST /api/teacher/assignments
router.post('/assignments', validate(createAssignmentSchema), async (req, res, next) => {
  try {
    const assignment = await teacherService.createAssignment(req.user.id, req.body);
    if (!assignment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found' } });

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/assignments/:assignmentId
router.put('/assignments/:assignmentId', validate(updateAssignmentSchema), async (req, res, next) => {
  try {
    const updated = await teacherService.updateAssignment(req.user.id, req.params.assignmentId, req.body);
    if (!updated) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/subjects/:subjectId/assignments
router.get('/subjects/:subjectId/assignments', async (req, res, next) => {
  try {
    const assignments = await teacherService.listSubjectAssignments(req.user.id, req.params.subjectId);
    if (!assignments) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found' } });

    res.json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
});

// ── Grades ────────────────────────────────────────────────────────────────────

// POST /api/teacher/grades — Enter grade
router.post('/grades', validate(enterGradeSchema), async (req, res, next) => {
  try {
    const { student_id, assignment_id, score } = req.body;
    const result = await teacherService.enterGrade(req.user.id, student_id, assignment_id, score);
    
    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } });
    if (result.error === 'VALIDATION_ERROR') return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: result.message } });

    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/grades/:gradeId — Update grade
router.put('/grades/:gradeId', validate(updateGradeSchema), async (req, res, next) => {
  try {
    const result = await teacherService.updateGrade(req.user.id, req.params.gradeId, req.body.score);
    
    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Grade not found' } });
    if (result.error === 'FORBIDDEN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } });

    res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
});

// ── Parents ───────────────────────────────────────────────────────────────────

// GET /api/teacher/parents — Parents of students in teacher's classes
router.get('/parents', async (req, res, next) => {
  try {
    const parents = await teacherService.listTeacherParents(req.user.id);
    res.json({ success: true, data: parents });
  } catch (err) {
    next(err);
  }
});

// ── Risk Alerts ───────────────────────────────────────────────────────────────

// GET /api/teacher/risk-alerts
router.get('/risk-alerts', async (req, res, next) => {
  try {
    const result = await teacherService.getRiskAlertsForTeacher(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/teacher/risk-alerts/trigger — Manually trigger risk analysis (dev/testing)
router.post('/risk-alerts/trigger', async (req, res, next) => {
  try {
    const { runRiskAnalysis } = require('../jobs/riskAnalysis');
    runRiskAnalysis(); // fire and forget
    res.json({ success: true, data: { message: 'Risk analysis triggered. Check back in a moment.' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
