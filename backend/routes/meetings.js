const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { validateResourceOwnership } = require('../middleware/schoolValidation');
const validate = require('../middleware/validate');
const { createMeetingSchema, updateMeetingSchema, meetingStatusSchema } = require('../schemas/meetings.schemas');
const { createMeetingRoom, deleteMeetingRoom } = require('../services/videoService');

const prisma = require("../lib/prisma");

router.use(authenticate);

// POST /api/meetings — Teacher schedules a meeting
router.post('/', requireRole('teacher'), validate(createMeetingSchema), async (req, res) => {
  try {
    const { parent_ids, student_ids, scheduled_at, duration_minutes, notes } = req.body;

    // Verify parents belong to same school (basic check)
    const parents = await prisma.user.findMany({
      where: { id: { in: parent_ids }, role: 'parent' },
    });
    if (parents.length !== parent_ids.length) return res.status(404).json({ error: 'One or more parents not found' });

    const students = await prisma.user.findMany({
      where: { id: { in: student_ids }, role: 'student' },
    });
    if (students.length !== student_ids.length) return res.status(404).json({ error: 'One or more students not found' });

    const duration = duration_minutes || 30;

    // Create meeting record with many-to-many connect
    const meeting = await prisma.meeting.create({
      data: {
        teacherId: req.user.id,
        scheduledAt: new Date(scheduled_at),
        durationMinutes: duration,
        notes: notes || null,
        status: 'scheduled',
        students: {
          connect: student_ids.map(id => ({ id }))
        },
        parents: {
          connect: parent_ids.map(id => ({ id }))
        }
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

    // Notify all parents
    const studentNames = students.map(s => s.name).join(', ');
    await Promise.all(parent_ids.map(pid => 
      prisma.notification.create({
        data: {
          recipientId: pid,
          type: 'meeting_invite',
          title: `📅 Meeting Scheduled`,
          body: `${req.user.name} has scheduled a meeting with you regarding ${studentNames} on ${new Date(scheduled_at).toLocaleString()}. Duration: ${duration} minutes.`,
        },
      })
    ));

    const updated = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        teacher: { select: { id: true, name: true } },
        parents: { select: { id: true, name: true } },
        students: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: updated });
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
        ? { teacherId: req.user.id }
        : req.user.role === 'parent' 
          ? { parents: { some: { id: req.user.id } } }
          : { students: { some: { id: req.user.id } } };

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
        parents: { select: { id: true, name: true } },
        students: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const upcoming = meetings.filter(
      (m) => new Date(m.scheduledAt) >= now && m.status !== 'cancelled' && m.status !== 'completed'
    );
    const past = meetings.filter(
      (m) => new Date(m.scheduledAt) < now || m.status === 'completed' || m.status === 'cancelled'
    );

    res.json({ success: true, data: { upcoming, past } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meetings/:meetingId — Single meeting detail
router.get('/:meetingId', validateResourceOwnership('meeting'), async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        ...(req.user.role === 'teacher'
          ? { teacherId: req.user.id }
          : req.user.role === 'parent'
            ? { parents: { some: { id: req.user.id } } }
            : { students: { some: { id: req.user.id } } }),
      },
      include: {
        teacher: { select: { id: true, name: true } },
        parents: { select: { id: true, name: true } },
        students: { select: { id: true, name: true } },
      },
    });

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/meetings/:meetingId/cancel
router.put('/:meetingId/cancel', requireRole('teacher'), validateResourceOwnership('meeting'), async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        teacherId: req.user.id,
      },
      include: { 
        students: { select: { name: true } },
        parents: { select: { id: true } }
      },
    });

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: 'cancelled' },
    });

    // Delete Daily.co room
    if (meeting.roomName) await deleteMeetingRoom(meeting.roomName);

    // Notify all parents
    const studentNames = meeting.students.map(s => s.name).join(', ');
    await Promise.all(meeting.parents.map(p => 
      prisma.notification.create({
        data: {
          recipientId: p.id,
          type: 'meeting_cancelled',
          title: `❌ Meeting Cancelled`,
          body: `Your meeting with ${req.user.name} regarding ${studentNames} scheduled for ${new Date(meeting.scheduledAt).toLocaleString()} has been cancelled.`,
        },
      })
    ));

    res.json({ success: true, data: { message: 'Meeting cancelled' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/meetings/:meetingId/complete
router.put('/:meetingId/complete', requireRole('teacher'), validateResourceOwnership('meeting'), async (req, res) => {

  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: req.params.meetingId,
        teacherId: req.user.id,
      },
    });

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: 'completed' },
    });

    res.json({ success: true, data: { message: 'Meeting marked as completed' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
