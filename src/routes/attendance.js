const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { markAttendanceSchema, updateAttendanceSchema } = require('../schemas/attendance.schemas');
const attendanceService = require('../services/attendanceService');
const logger = require('../lib/logger');

router.use(authenticate);

router.post('/', requireRole('teacher', 'admin'), validate(markAttendanceSchema), async (req, res, next) => {
  try {
    const result = await attendanceService.markAttendance(
      req.user.school_id, 
      req.user.id, 
      req.user.role, 
      req.body
    );

    if (result.error === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: result.message } });
    if (result.error === 'FORBIDDEN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: result.message } });

    logger.info('audit:attendance.mark', { requestId: req.id, actorId: req.user.id, actorRole: req.user.role, schoolId: req.user.school_id, body: req.body });
    res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
});

router.get('/class/:classId', requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const prisma = require('../lib/prisma');
    const cls = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.user.school_id },
      select: { id: true },
    });
    if (!cls) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    const records = await attendanceService.getClassAttendance(req.params.classId, from, to);
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

router.get('/today/:classId', requireRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const cls = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.user.school_id },
      select: { id: true },
    });
    if (!cls) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    const result = await attendanceService.getTodayAttendance(req.params.classId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/student/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { from, to } = req.query;

    if (req.user.role === 'parent') {
      const authorized = await attendanceService.isParentAuthorized(req.user.id, studentId);
      if (!authorized) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to view this student' } });
    }

    const { records, summary } = await attendanceService.getStudentAttendance(studentId, from, to);
    res.json({ success: true, data: { records, summary } });
  } catch (err) {
    next(err);
  }
});

router.put('/:attendanceId', requireRole('teacher', 'admin'), validate(updateAttendanceSchema), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const updated = await attendanceService.updateAttendanceRecord(req.params.attendanceId, status, note);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
