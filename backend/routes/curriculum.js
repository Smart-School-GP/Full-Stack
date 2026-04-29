const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const logger = require('../lib/logger');

// All curriculum routes require admin role
router.use(authenticate, requireRole('admin'));

/**
 * GET /api/admin/curriculum
 * List all curriculums (one per grade level)
 */
router.get('/', async (req, res, next) => {
  try {
    const curriculums = await prisma.curriculum.findMany({
      include: {
        _count: { select: { subjects: true } }
      },
      orderBy: { gradeLevel: 'asc' }
    });
    res.json({ success: true, data: curriculums });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/curriculum/:id
 * Get details for a specific grade's curriculum
 */
router.get('/:id', async (req, res, next) => {
  try {
    const curriculum = await prisma.curriculum.findUnique({
      where: { id: req.params.id },
      include: {
        subjects: {
          include: {
            learningPaths: {
              select: { id: true, title: true, isPublished: true, _count: { select: { modules: true } } }
            }
          }
        }
      }
    });
    if (!curriculum) return res.status(404).json({ success: false, error: { message: 'Curriculum not found' } });
    res.json({ success: true, data: curriculum });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/curriculum
 * Create or Update a curriculum for a grade
 */
router.post('/', async (req, res, next) => {
  try {
    const { gradeLevel, name } = req.body;
    const curriculum = await prisma.curriculum.upsert({
      where: { gradeLevel: parseInt(gradeLevel) },
      update: { name },
      create: { gradeLevel: parseInt(gradeLevel), name }
    });
    logger.info('audit:curriculum.upsert', { actorId: req.user.id, gradeLevel, curriculumId: curriculum.id });
    res.status(201).json({ success: true, data: curriculum });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/curriculum/:id/subjects
 * Add a subject to a curriculum
 */
router.post('/:id/subjects', async (req, res, next) => {
  try {
    const { name, learningPathId } = req.body;
    const subject = await prisma.curriculumSubject.create({
      data: {
        curriculumId: req.params.id,
        name,
        ...(learningPathId && {
          learningPaths: {
            connect: { id: learningPathId }
          }
        })
      }
    });
    logger.info('audit:curriculum.subject.create', { actorId: req.user.id, curriculumId: req.params.id, subjectId: subject.id });
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/curriculum/subjects/:subjectId
 * Remove a subject from a curriculum
 */
router.delete('/subjects/:subjectId', async (req, res, next) => {
  try {
    await prisma.curriculumSubject.delete({
      where: { id: req.params.subjectId }
    });
    res.json({ success: true, data: { message: 'Subject removed' } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/curriculum/grade/:gradeLevel
 * Helper to fetch curriculum by grade level directly
 */
router.get('/grade/:gradeLevel', async (req, res, next) => {
  try {
    const curriculum = await prisma.curriculum.findUnique({
      where: { gradeLevel: parseInt(req.params.gradeLevel) },
      include: {
        subjects: {
          include: {
            learningPaths: true
          }
        }
      }
    });
    res.json({ success: true, data: curriculum });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
