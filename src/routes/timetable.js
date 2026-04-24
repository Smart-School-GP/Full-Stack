const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPeriodSchema, updatePeriodSchema, createSlotSchema } = require('../schemas/timetable.schemas');
const { checkTeacherConflict, checkClassConflict, buildClassTimetable, getTodaySchedule } = require('../services/timetableService');
const prisma = require('../lib/prisma');

router.use(authenticate);

// POST /api/timetable/periods — Admin defines bell schedule
router.post('/periods', requireRole('admin'), validate(createPeriodSchema), async (req, res) => {
  try {
    const { name, start_time, end_time, period_number } = req.body;
    if (!name || !start_time || !end_time || period_number === undefined) {
      return res.status(400).json({ error: 'name, start_time, end_time, period_number required' });
    }

    const period = await prisma.timetablePeriod.create({
      data: {
        schoolId: req.user.school_id,
        name,
        startTime: start_time,
        endTime: end_time,
        periodNumber: parseInt(period_number),
      },
    });
    res.status(201).json(period);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Period number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/periods
router.get('/periods', async (req, res) => {
  try {
    const periods = await prisma.timetablePeriod.findMany({
      where: { schoolId: req.user.school_id },
      orderBy: { periodNumber: 'asc' },
    });
    res.json(periods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timetable/periods/:periodId
router.put('/periods/:periodId', requireRole('admin'), validate(updatePeriodSchema), async (req, res) => {
  try {
    const { name, start_time, end_time } = req.body;
    const period = await prisma.timetablePeriod.findFirst({
      where: { id: req.params.periodId, schoolId: req.user.school_id },
    });
    if (!period) return res.status(404).json({ error: 'Period not found' });

    const updated = await prisma.timetablePeriod.update({
      where: { id: req.params.periodId },
      data: {
        ...(name !== undefined && { name }),
        ...(start_time !== undefined && { startTime: start_time }),
        ...(end_time !== undefined && { endTime: end_time }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/periods/:periodId
router.delete('/periods/:periodId', requireRole('admin'), async (req, res) => {
  try {
    const period = await prisma.timetablePeriod.findFirst({
      where: { id: req.params.periodId, schoolId: req.user.school_id },
    });
    if (!period) return res.status(404).json({ error: 'Period not found' });
    await prisma.timetablePeriod.delete({ where: { id: req.params.periodId } });
    res.json({ message: 'Period deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timetable/slots — Admin assigns subject to slot
router.post('/slots', requireRole('admin'), validate(createSlotSchema), async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id, period_id, day_of_week, room, color, effective_from } = req.body;
    if (!class_id || !subject_id || !period_id || day_of_week === undefined || !effective_from) {
      return res.status(400).json({ error: 'class_id, subject_id, period_id, day_of_week, effective_from required' });
    }

    // Conflict detection
    if (teacher_id) {
      const teacherConflict = await checkTeacherConflict(teacher_id, period_id, parseInt(day_of_week), effective_from);
      if (teacherConflict) {
        return res.status(409).json({
          error: `Teacher conflict: already teaching ${teacherConflict.subject?.name} in ${teacherConflict.class?.name} at this time`,
        });
      }
    }

    const classConflict = await checkClassConflict(class_id, period_id, parseInt(day_of_week), effective_from);
    if (classConflict) {
      return res.status(409).json({
        error: `Class conflict: ${classConflict.subject?.name} is already scheduled at this time`,
      });
    }

    const slot = await prisma.timetableSlot.create({
      data: {
        schoolId: req.user.school_id,
        classId: class_id,
        subjectId: subject_id,
        teacherId: teacher_id || null,
        periodId: period_id,
        dayOfWeek: parseInt(day_of_week),
        room,
        color,
        effectiveFrom: new Date(effective_from),
      },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        period: true,
        class: { select: { id: true, name: true } },
      },
    });

    // Notify affected students
    Promise.resolve().then(async () => {
      const students = await prisma.studentClass.findMany({
        where: { classId: class_id },
        select: { studentId: true },
      });
      await Promise.all(
        students.map((s) =>
          prisma.notification.create({
            data: {
              schoolId: req.user.school_id,
              recipientId: s.studentId,
              type: 'timetable_change',
              title: 'Timetable updated',
              body: `A new class has been added to your schedule: ${slot.subject.name}`,
            },
          }).catch(() => {})
        )
      );
    });

    // Notify assigned teacher (if any)
    if (teacher_id) {
      Promise.resolve().then(async () => {
        await prisma.notification.create({
          data: {
            schoolId: req.user.school_id,
            recipientId: teacher_id,
            type: 'timetable_change',
            title: 'New class assigned',
            body: `You have been assigned to teach ${slot.subject.name} in ${slot.class.name} on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek]}.`,
          },
        }).catch(() => {});
      });
    }

    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/class/:classId
router.get('/class/:classId', async (req, res) => {
  try {
    const slots = await buildClassTimetable(req.params.classId, req.user.school_id);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/teacher/:teacherId
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    // Only teacher themselves or admin
    if (req.user.role === 'teacher' && req.user.id !== req.params.teacherId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const slots = await prisma.timetableSlot.findMany({
      where: {
        teacherId: req.params.teacherId,
        schoolId: req.user.school_id,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        period: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
    });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/today/:classId
router.get('/today/:classId', async (req, res) => {
  try {
    const slots = await getTodaySchedule(req.params.classId, req.user.school_id);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/student/:studentId — Parent or admin views student timetable
router.get('/student/:studentId', async (req, res) => {
  try {
    const student = await prisma.user.findFirst({
      where: { id: req.params.studentId, schoolId: req.user.school_id },
      select: { id: true, name: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const studentClass = await prisma.studentClass.findFirst({
      where: { studentId: req.params.studentId },
      select: { classId: true },
    });
    if (!studentClass) return res.json({ student, slots: [] });

    const slots = await buildClassTimetable(studentClass.classId, req.user.school_id);
    res.json({ student, slots, studentName: student.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/my — Current user's timetable (teacher or student)
router.get('/my', async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const slots = await prisma.timetableSlot.findMany({
        where: {
          teacherId: req.user.id,
          schoolId: req.user.school_id,
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
        },
        include: {
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          period: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
      });
      return res.json(slots);
    }
    if (req.user.role === 'student') {
      const studentClass = await prisma.studentClass.findFirst({
        where: { studentId: req.user.id },
        select: { classId: true },
      });
      if (!studentClass) return res.json([]);
      const slots = await buildClassTimetable(studentClass.classId, req.user.school_id);
      return res.json(slots);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/today — Today's schedule for current user
router.get('/today', async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const studentClass = await prisma.studentClass.findFirst({
        where: { studentId: req.user.id },
        select: { classId: true },
      });
      if (!studentClass) return res.json([]);
      const slots = await getTodaySchedule(studentClass.classId, req.user.school_id);
      return res.json(slots);
    }
    if (req.user.role === 'teacher') {
      const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
      const slots = await prisma.timetableSlot.findMany({
        where: {
          teacherId: req.user.id,
          schoolId: req.user.school_id,
          dayOfWeek,
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
        },
        include: {
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          period: true,
        },
        orderBy: { period: { periodNumber: 'asc' } },
      });
      return res.json(slots);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/slots/:slotId
router.delete('/slots/:slotId', requireRole('admin'), async (req, res) => {
  try {
    const slot = await prisma.timetableSlot.findFirst({
      where: { id: req.params.slotId, schoolId: req.user.school_id },
      include: { subject: { select: { name: true } } },
    });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Notify affected class before deletion
    const students = await prisma.studentClass.findMany({
      where: { classId: slot.classId },
      select: { studentId: true },
    });

    await prisma.timetableSlot.delete({ where: { id: req.params.slotId } });

    // Non-blocking notification
    Promise.resolve().then(async () => {
      await Promise.all(
        students.map((s) =>
          prisma.notification.create({
            data: {
              schoolId: req.user.school_id,
              recipientId: s.studentId,
              type: 'timetable_change',
              title: 'Class canceled or moved',
              body: `The ${slot.subject.name} class on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek]} has been removed from the timetable.`,
            },
          }).catch(() => {})
        )
      );
    });

    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/all-classes — Admin overview
router.get('/all-classes', requireRole('admin'), async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.user.school_id },
      include: {
        timetableSlots: {
          where: { OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }] },
          include: {
            subject: { select: { name: true } },
            teacher: { select: { name: true } },
            period: true,
          },
        },
      },
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
