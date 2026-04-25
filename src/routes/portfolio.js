const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { validateResourceOwnership } = require('../middleware/schoolValidation');
const validate = require('../middleware/validate');
const { createPortfolioItemSchema, updatePortfolioItemSchema } = require('../schemas/portfolio.schemas');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { upload, uploadToCloudinary } = require('../services/fileUpload');
const { awardXP } = require('../services/xpService');
const prisma = require('../lib/prisma');

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

router.use(authenticate);

// GET /api/portfolio/:studentId
router.get('/:studentId', async (req, res) => {
  try {
    const isOwn = req.user.id === req.params.studentId;
    const isTeacherOrAdmin = ['teacher', 'admin'].includes(req.user.role);

    const items = await prisma.portfolioItem.findMany({
      where: {
        studentId: req.params.studentId,
        schoolId: req.user.school_id,
        ...(isOwn || isTeacherOrAdmin ? {} : { isPublic: true }),
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const student = await prisma.user.findFirst({
      where: { id: req.params.studentId, schoolId: req.user.school_id },
      select: { id: true, name: true, role: true },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.json({ student, items, isOwn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/me — Current student's own portfolio
router.get('/me', async (req, res) => {
  try {
    const items = await prisma.portfolioItem.findMany({
      where: { studentId: req.user.id, schoolId: req.user.school_id },
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio/items — Student adds portfolio item
router.post('/items', requireRole('student'), uploadLimiter, upload.single('file'), validate(createPortfolioItemSchema), async (req, res) => {

  try {
    const b = req.body;
    const title = b.title;
    const description = b.description;
    const type = b.type;
    const subject_id = b.subjectId || b.subject_id;
    const is_public = b.isPublic ?? b.is_public;
    if (!title || !type) return res.status(400).json({ error: 'title and type required' });

    let fileUrl = null;
    let thumbnailUrl = null;

    if (req.file) {
      // Upload original
      const result = await uploadToCloudinary(
        req.file.buffer,
        `portfolio/${req.user.id}`,
        `${Date.now()}_${req.file.originalname}`
      );
      fileUrl = result.secure_url;

      // Generate thumbnail for images using Sharp
      if (sharp && req.file.mimetype.startsWith('image/')) {
        try {
          const thumbBuffer = await sharp(req.file.buffer)
            .resize(400, 300, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();

          const thumbResult = await uploadToCloudinary(
            thumbBuffer,
            `portfolio/${req.user.id}/thumbs`,
            `thumb_${Date.now()}`
          );
          thumbnailUrl = thumbResult.secure_url;
        } catch (thumbErr) {
          console.warn('[Portfolio] Thumbnail generation failed:', thumbErr.message);
        }
      }
    }

    const item = await prisma.portfolioItem.create({
      data: {
        studentId: req.user.id,
        schoolId: req.user.school_id,
        title: title.trim(),
        description,
        type,
        fileUrl,
        thumbnailUrl,
        subjectId: subject_id || null,
        isPublic: is_public === 'true' || is_public === true,
      },
      include: { subject: { select: { id: true, name: true } } },
    });

    // Non-blocking XP
    Promise.resolve().then(() => awardXP(req.user.id, 12, 'portfolio_item_added'));

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/portfolio/items/:itemId
router.put('/items/:itemId', requireRole('student'), validateResourceOwnership('portfolio', 'itemId'), validate(updatePortfolioItemSchema), async (req, res) => {

  try {
    const b = req.body;
    const title = b.title;
    const description = b.description;
    const isPublic = b.isPublic ?? b.is_public;
    const subjectId = b.subjectId || b.subject_id;

    const item = await prisma.portfolioItem.findFirst({
      where: { id: req.params.itemId, studentId: req.user.id },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const updated = await prisma.portfolioItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(subjectId !== undefined && { subjectId }),
      },
      include: { subject: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/portfolio/items/:itemId
router.delete('/items/:itemId', validateResourceOwnership('portfolio', 'itemId'), async (req, res) => {

  try {
    const where = { id: req.params.itemId };
    if (req.user.role !== 'admin') where.studentId = req.user.id;

    const item = await prisma.portfolioItem.findFirst({ where });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    await prisma.portfolioItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
