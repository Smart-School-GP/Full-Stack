const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBadgeSchema, updateBadgeSchema, awardBadgeSchema } = require('../schemas/badges.schemas');
const prisma = require('../lib/prisma');
const { upload, uploadToCloudinary } = require('../services/fileUpload');

router.use(authenticate);

// GET /api/badges/school — All badge definitions
router.get('/school', async (req, res) => {
  try {
    const badges = await prisma.badgeDefinition.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/badges — Admin creates badge
router.post('/', requireRole('admin'), upload.single('icon'), validate(createBadgeSchema), async (req, res) => {
  try {
    const b = req.body;
    const name = b.name;
    const description = b.description;
    const iconEmoji = b.iconEmoji || b.icon_emoji;
    const color = b.color;
    const criteriaType = b.criteriaType || b.criteria_type;
    const criteriaValue = b.criteriaValue ?? b.criteria_value ?? 0;
    const pointsValue = b.pointsValue ?? b.points_value ?? 10;
    const isActive = b.isActive ?? b.is_active ?? true;

    let iconUrl = b.iconUrl || b.icon_url;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'badges');
      if (result) {
        iconUrl = result.secure_url;
      }
    }

    if (!name || !criteriaType) return res.status(400).json({ error: 'name and criteriaType required' });

    const badge = await prisma.badgeDefinition.create({
      data: {
        name,
        description,
        iconEmoji,
        iconUrl,
        color,
        criteriaType,
        criteriaValue,
        pointsValue,
        isActive,
      },
    });
    res.status(201).json(badge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/badges/:badgeId — Admin updates badge
router.put('/:badgeId', requireRole('admin'), upload.single('icon'), validate(updateBadgeSchema), async (req, res) => {
  try {
    const b = req.body;
    const name = b.name;
    const description = b.description;
    const iconEmoji = b.iconEmoji || b.icon_emoji;
    const color = b.color;
    const criteriaType = b.criteriaType || b.criteria_type;
    const criteriaValue = b.criteriaValue ?? b.criteria_value;
    const pointsValue = b.pointsValue ?? b.points_value;
    const isActive = b.isActive ?? b.is_active;
    let iconUrl = b.iconUrl || b.icon_url;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'badges');
      if (result) {
        iconUrl = result.secure_url;
      }
    }

    const badge = await prisma.badgeDefinition.findFirst({
      where: { id: req.params.badgeId },
    });
    if (!badge) return res.status(404).json({ error: 'Badge not found' });

    const updated = await prisma.badgeDefinition.update({
      where: { id: req.params.badgeId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(iconEmoji !== undefined && { iconEmoji }),
        ...(iconUrl !== undefined && { iconUrl }),
        ...(color !== undefined && { color }),
        ...(criteriaType !== undefined && { criteriaType }),
        ...(criteriaValue !== undefined && { criteriaValue }),
        ...(pointsValue !== undefined && { pointsValue }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/badges/:badgeId — Admin deletes badge definition
router.delete('/:badgeId', requireRole('admin'), async (req, res) => {
  try {
    const badge = await prisma.badgeDefinition.findFirst({
      where: { id: req.params.badgeId },
    });
    if (!badge) return res.status(404).json({ error: 'Badge not found' });
    await prisma.badgeDefinition.delete({ where: { id: req.params.badgeId } });
    res.json({ message: 'Badge deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/badges/award — Teacher/admin manually awards badge
router.post('/award', requireRole('teacher', 'admin'), validate(awardBadgeSchema), async (req, res) => {
  try {
    const { student_id, badge_id, note } = req.body;
    if (!student_id || !badge_id) return res.status(400).json({ error: 'student_id and badge_id required' });

    const student = await prisma.user.findFirst({
      where: { id: student_id, role: 'student' },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const badge = await prisma.badgeDefinition.findFirst({
      where: { id: badge_id },
    });
    if (!badge) return res.status(404).json({ error: 'Badge not found' });

    const award = await prisma.studentBadge.create({
      data: {
        studentId: student_id,
        badgeId: badge_id,
        awardedBy: req.user.id,
        note,
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        recipientId: student_id,
        type: 'badge_earned',
        title: `You earned the "${badge.name}" badge! ${badge.iconEmoji || '🏆'}`,
        body: note || badge.description || 'Awarded by your teacher.',
      },
    });

    res.status(201).json(award);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Student already has this badge' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/badges/student/:studentId — Student's earned badges
router.get('/student/:studentId', async (req, res) => {
  try {
    const badges = await prisma.studentBadge.findMany({
      where: { studentId: req.params.studentId },
      include: {
        badge: true,
        awarder: { select: { id: true, name: true } },
      },
      orderBy: { awardedAt: 'desc' },
    });
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/badges/award-history — Admin sees all award history
router.get('/award-history', requireRole('admin'), async (req, res) => {
  try {
    const history = await prisma.studentBadge.findMany({
      where: {},
      include: {
        badge: { select: { id: true, name: true, iconEmoji: true } },
        student: { select: { id: true, name: true } },
        awarder: { select: { id: true, name: true } },
      },
      orderBy: { awardedAt: 'desc' },
      take: 100,
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
