const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const studentService = require('../services/studentService');

router.use(authenticate, requireRole('student'));

// GET /api/student/grades
router.get('/grades', async (req, res, next) => {
  try {
    const finalGrades = await studentService.getStudentGrades(req.user.id);
    res.json({ success: true, data: finalGrades });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/subjects/:subjectId/details
router.get('/subjects/:subjectId/details', async (req, res, next) => {
  try {
    const data = await studentService.getStudentSubjectDetail(req.user.id, req.user.school_id, req.params.subjectId);
    if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subject not found in your school' } });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
