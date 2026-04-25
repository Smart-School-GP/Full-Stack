const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createEventSchema, updateEventSchema } = require('../schemas/events.schemas');
const prisma = require('../lib/prisma');

router.use(authenticate);

// POST /api/events
router.post('/', requireRole('admin'), validate(createEventSchema), async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, affects_rooms, color } = req.body;
    if (!title || !event_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'title, event_type, start_date, end_date required' });
    }

    const event = await prisma.schoolEvent.create({
      data: {
        title,
        description,
        eventType: event_type,
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        affectsRooms: affects_rooms ? JSON.stringify(affects_rooms) : null,
        createdBy: req.user.id,
        color,
      },
    });

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};

    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }

    const events = await prisma.schoolEvent.findMany({
      where,
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { startDate: 'asc' },
    });

    // Format for FullCalendar
    const formatted = events.map((e) => ({
      ...e,
      start: e.startDate,
      end: e.endDate,
      affectsRooms: e.affectsRooms ? JSON.parse(e.affectsRooms) : null,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:eventId
router.put('/:eventId', requireRole('admin'), validate(updateEventSchema), async (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, affects_rooms, color } = req.body;

    const event = await prisma.schoolEvent.findFirst({
      where: { id: req.params.eventId },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const updated = await prisma.schoolEvent.update({
      where: { id: req.params.eventId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(event_type !== undefined && { eventType: event_type }),
        ...(start_date !== undefined && { startDate: new Date(start_date) }),
        ...(end_date !== undefined && { endDate: new Date(end_date) }),
        ...(affects_rooms !== undefined && { affectsRooms: JSON.stringify(affects_rooms) }),
        ...(color !== undefined && { color }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:eventId
router.delete('/:eventId', requireRole('admin'), async (req, res) => {
  try {
    const event = await prisma.schoolEvent.findFirst({
      where: { id: req.params.eventId },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    await prisma.schoolEvent.delete({ where: { id: req.params.eventId } });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
