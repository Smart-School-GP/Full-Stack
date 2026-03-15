const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const { createMeetingRoom, deleteMeetingRoom } = require('../services/videoService');

const prisma = new PrismaClient();

router.use(authenticate);

// POST /api/meetings — Teacher schedules a meeting
router.post('/', requireRole('teacher'), async (req, res) => {
  try {
    const { parent_id, student_id, scheduled_at, duration_minutes, notes } = req.body;

    if (!parent_id || !student_id || !scheduled_at) {
      return res.status(400).json({ error: 'parent_id, student_id, scheduled_at required' });
    }

    // Verify parent belongs to same school
    const parent = await prisma.user.findFirst({
      where: { id: parent_id, schoolId: req.user.school_id, role: 'parent' },
    });
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    const student = await prisma.user.findFirst({
      where: { id: student_id, schoolId: req.user.school_id, role: 'student' },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const duration = duration_minutes || 30;

    // Create meeting record first to get ID
    const meeting = await prisma.meeting.create({
      data: {
        schoolId: req.user.school_id,
        teacherId: req.user.id,
        parentId: parent_id,
        studentId: student_id,
        scheduledAt: new Date(scheduled_at),
        durationMinutes: duration,
        notes: notes || null,
        status: 'scheduled',
      },
    });

    // Create Daily.co room
    let roomUrl = null;
    let roomName = null;
    try {
      roomUrl = await createMeetingRoom(meeting.id, duration);
      roomName = `meeting-${meeting.id}`;

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { roomUrl, roomName },
      });
    } catch (roomErr) {
      console.warn('[Meetings] Could not create video room:', roomErr.message);
    }

    // Notify parent
    await prisma.notification.create({
      data: {
        schoolId: req.user.school_id,
        recipientId: parent_id,
        type: 'meeting_invite',
        title: `📅 Meeting Scheduled`,
        body: `${req.user.name} has scheduled a meeting with you regarding ${student.name} on ${new Date(scheduled_at).toLocaleString()}. Duration: ${duration} minutes.`,
      },
    });

    const updated = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        teacher: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meetings — All meetings for logged-in user
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const where =
      req.user.role === 'teacher'
        ? { teacherId: req.user.id, schoolId: req.user.school_id }
        : { parentId: req.user.id, schoolId: req.user.school_id };

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const upcoming = meetings.filter(
      (m) => new Date(m.scheduledAt) >= now && m.status !== 'cancelled' && m.status !== 'completed'
    );
    const past = meetings.filter(
      (m) => new Date(m.scheduledAt) < now || m.status === 'completed' || m.status === 'cancelled'
    );

    res.json({ upcoming, past });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meetings/:meetingId — Single meeting detail
router.get('/:meetingId', async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        schoolId: req.user.school_id,
        ...(req.user.role === 'teacher'
          ? { teacherId: req.user.id }
          : { parentId: req.user.id }),
      },
      include: {
        teacher: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/meetings/:meetingId/cancel
router.put('/:meetingId/cancel', requireRole('teacher'), async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        teacherId: req.user.id,
        schoolId: req.user.school_id,
      },
      include: { student: { select: { name: true } } },
    });

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: 'cancelled' },
    });

    // Delete Daily.co room
    if (meeting.roomName) await deleteMeetingRoom(meeting.roomName);

    // Notify parent
    await prisma.notification.create({
      data: {
        schoolId: req.user.school_id,
        recipientId: meeting.parentId,
        type: 'meeting_cancelled',
        title: `❌ Meeting Cancelled`,
        body: `Your meeting with ${req.user.name} regarding ${meeting.student.name} scheduled for ${new Date(meeting.scheduledAt).toLocaleString()} has been cancelled.`,
      },
    });

    res.json({ message: 'Meeting cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/meetings/:meetingId/complete
router.put('/:meetingId/complete', requireRole('teacher'), async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        teacherId: req.user.id,
        schoolId: req.user.school_id,
      },
    });

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: 'completed' },
    });

    res.json({ message: 'Meeting marked as completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
