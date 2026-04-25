const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPeriodSchema, updatePeriodSchema, createSlotSchema } = require('../schemas/timetable.schemas');
const { checkTeacherConflict, checkRoomConflict, buildRoomTimetable, getTodaySchedule } = require('../services/timetableService');
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
      where: {},
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
      where: { id: req.params.periodId },
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
      where: { id: req.params.periodId },
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
    const { room_id, subject_id, teacher_id, period_id, day_of_week, room, color, effective_from } = req.body;
    if (!room_id || !subject_id || !period_id || day_of_week === undefined || !effective_from) {
      return res.status(400).json({ error: 'room_id, subject_id, period_id, day_of_week, effective_from required' });
    }

    // Conflict detection
    if (teacher_id) {
      const teacherConflict = await checkTeacherConflict(teacher_id, period_id, parseInt(day_of_week), effective_from);
      if (teacherConflict) {
        return res.status(409).json({
          error: `Teacher conflict: already teaching ${teacherConflict.subject?.name} in ${teacherConflict.room?.name} at this time`,
        });
      }
    }

    const roomConflict = await checkRoomConflict(room_id, period_id, parseInt(day_of_week), effective_from);
    if (roomConflict) {
      return res.status(409).json({
        error: `Room conflict: ${roomConflict.subject?.name} is already scheduled at this time`,
      });
    }

    const slot = await prisma.timetableSlot.create({
      data: {
        roomId: room_id,
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
        room: { select: { id: true, name: true } },
      },
    });

    // Notify affected students
    Promise.resolve().then(async () => {
      const students = await prisma.studentRoom.findMany({
        where: { roomId: room_id },
        select: { studentId: true },
      });
      await Promise.all(
        students.map((s) =>
          prisma.notification.create({
            data: {
              recipientId: s.studentId,
              type: 'timetable_change',
              title: 'Timetable updated',
              body: `A new room has been added to your schedule: ${slot.subject.name}`,
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
            recipientId: teacher_id,
            type: 'timetable_change',
            title: 'New room assigned',
            body: `You have been assigned to teach ${slot.subject.name} in ${slot.room.name} on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek]}.`,
          },
        }).catch(() => {});
      });
    }

    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/room/:roomId
router.get('/room/:roomId', async (req, res) => {
  try {
    const slots = await buildRoomTimetable(req.params.roomId);
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
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        subject: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
        period: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
    });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/today/:roomId
router.get('/today/:roomId', async (req, res) => {
  try {
    const slots = await getTodaySchedule(req.params.roomId);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/student/:studentId — Parent or admin views student timetable
router.get('/student/:studentId', async (req, res) => {
  try {
    const student = await prisma.user.findFirst({
      where: { id: req.params.studentId },
      select: { id: true, name: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const studentRoom = await prisma.studentRoom.findFirst({
      where: { studentId: req.params.studentId },
      select: { roomId: true },
    });
    if (!studentRoom) return res.json({ student, slots: [] });

    const slots = await buildRoomTimetable(studentRoom.roomId);
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
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
        },
        include: {
          subject: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          period: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
      });
      return res.json(slots);
    }
    if (req.user.role === 'student') {
      const studentRoom = await prisma.studentRoom.findFirst({
        where: { studentId: req.user.id },
        select: { roomId: true },
      });
      if (!studentRoom) return res.json([]);
      const slots = await buildRoomTimetable(studentRoom.roomId);
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
      const studentRoom = await prisma.studentRoom.findFirst({
        where: { studentId: req.user.id },
        select: { roomId: true },
      });
      if (!studentRoom) return res.json([]);
      const slots = await getTodaySchedule(studentRoom.roomId);
      return res.json(slots);
    }
    if (req.user.role === 'teacher') {
      const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
      const slots = await prisma.timetableSlot.findMany({
        where: {
          teacherId: req.user.id,
          dayOfWeek,
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
        },
        include: {
          subject: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
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
      where: { id: req.params.slotId },
      include: { subject: { select: { name: true } } },
    });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Notify affected room before deletion
    const students = await prisma.studentRoom.findMany({
      where: { roomId: slot.roomId },
      select: { studentId: true },
    });

    await prisma.timetableSlot.delete({ where: { id: req.params.slotId } });

    // Non-blocking notification
    Promise.resolve().then(async () => {
      await Promise.all(
        students.map((s) =>
          prisma.notification.create({
            data: {
              recipientId: s.studentId,
              type: 'timetable_change',
              title: 'Room canceled or moved',
              body: `The ${slot.subject.name} room on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek]} has been removed from the timetable.`,
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

// GET /api/timetable/all-rooms — Admin overview
router.get('/all-rooms', requireRole('admin'), async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: {},
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
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
