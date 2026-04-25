const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const parentService = require('../services/parentService');

router.use(authenticate, requireRole('parent'));

// GET /api/parent/children
router.get('/children', async (req, res, next) => {
  try {
    const children = await parentService.getChildren(req.user.id);
    res.json({ success: true, data: children });
  } catch (err) {
    next(err);
  }
});

// GET /api/parent/overview — aggregated dashboard widgets data
router.get('/overview', async (req, res, next) => {
  try {
    const overview = await parentService.getParentOverview(req.user.id);
    res.json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
});

// GET /api/parent/children/:studentId/grades
router.get('/children/:studentId/grades', async (req, res, next) => {
  try {
    const rel = await parentService.verifyParentStudent(req.user.id, req.params.studentId);
    if (!rel) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const grades = await parentService.getChildGrades(req.params.studentId);
    res.json({ success: true, data: grades });
  } catch (err) {
    next(err);
  }
});

// GET /api/parent/children/:studentId/subjects/:subjectId/details
router.get('/children/:studentId/subjects/:subjectId/details', async (req, res, next) => {
  try {
    const rel = await parentService.verifyParentStudent(req.user.id, req.params.studentId);
    if (!rel) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const detail = await parentService.getChildSubjectDetail(req.params.studentId, req.params.subjectId);
    res.json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
});

// GET /api/parent/teachers — list teachers for the parent's children
router.get('/teachers', async (req, res, next) => {
  try {
    const teachers = await parentService.getTeachersForChildren(req.user.id);
    res.json({ success: true, data: teachers });
  } catch (err) {
    next(err);
  }
});

// GET /api/parent/children/:studentId/history
router.get('/children/:studentId/history', async (req, res, next) => {
  try {
    const rel = await parentService.verifyParentStudent(req.user.id, req.params.studentId);
    if (!rel) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const history = await parentService.getChildHistory(req.params.studentId);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// GET /api/parent/children/:studentId/profile
router.get('/children/:studentId/profile', async (req, res, next) => {
  try {
    const rel = await parentService.verifyParentStudent(req.user.id, req.params.studentId);
    if (!rel) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const profile = await parentService.getChildProfile(req.params.studentId);
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
