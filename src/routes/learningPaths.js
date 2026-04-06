const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { awardXP } = require('../services/xpService');
const { checkAndAwardBadges } = require('../services/badgeEngine');
const prisma = require('../lib/prisma');

router.use(authenticate);

// POST /api/learning-paths — Teacher creates a path
router.post('/', requireRole('teacher'), async (req, res) => {
  try {
    const { subject_id, title, description } = req.body;
    if (!subject_id || !title) return res.status(400).json({ error: 'subject_id and title required' });

    const subject = await prisma.subject.findFirst({
      where: { id: subject_id, teacherId: req.user.id },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const path = await prisma.learningPath.create({
      data: {
        schoolId: req.user.school_id,
        subjectId: subject_id,
        teacherId: req.user.id,
        title,
        description,
      },
    });
    res.status(201).json(path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/learning-paths/subject/:subjectId
router.get('/subject/:subjectId', requireRole('teacher', 'student'), async (req, res) => {
  try {
    const paths = await prisma.learningPath.findMany({
      where: {
        subjectId: req.params.subjectId,
        schoolId: req.user.school_id,
        ...(req.user.role === 'student' ? { isPublished: true } : {}),
      },
      include: {
        _count: { select: { modules: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { orderIndex: 'asc' },
    });
    res.json(paths);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/learning-paths/my — Student's paths across all subjects
router.get('/my', requireRole('student'), async (req, res) => {
  try {
    const studentClasses = await prisma.studentClass.findMany({
      where: { studentId: req.user.id },
      select: { classId: true },
    });
    const classIds = studentClasses.map((sc) => sc.classId);

    const subjects = await prisma.subject.findMany({
      where: { classId: { in: classIds } },
      select: { id: true },
    });
    const subjectIds = subjects.map((s) => s.id);

    const paths = await prisma.learningPath.findMany({
      where: {
        subjectId: { in: subjectIds },
        schoolId: req.user.school_id,
        isPublished: true,
      },
      include: {
        subject: { select: { id: true, name: true } },
        modules: {
          include: {
            items: {
              where: { isRequired: true },
              include: {
                progress: { where: { studentId: req.user.id } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with completion %
    const enriched = paths.map((path) => {
      const allItems = path.modules.flatMap((m) => m.items);
      const completed = allItems.filter((i) => i.progress[0]?.status === 'completed').length;
      return {
        ...path,
        completedItems: completed,
        totalItems: allItems.length,
        completionPercentage: allItems.length > 0 ? Math.round((completed / allItems.length) * 100) : 0,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/learning-paths/:pathId
router.get('/:pathId', async (req, res) => {
  try {
    const path = await prisma.learningPath.findFirst({
      where: {
        id: req.params.pathId,
        schoolId: req.user.school_id,
        ...(req.user.role === 'student' ? { isPublished: true } : {}),
      },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            items: {
              orderBy: { orderIndex: 'asc' },
              include: {
                progress: req.user.role === 'student'
                  ? { where: { studentId: req.user.id } }
                  : false,
              },
            },
          },
        },
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!path) return res.status(404).json({ error: 'Path not found' });
    res.json(path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/learning-paths/:pathId
router.put('/:pathId', requireRole('teacher'), async (req, res) => {
  try {
    const { title, description, is_published, order_index } = req.body;
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.pathId, teacherId: req.user.id },
    });
    if (!path) return res.status(404).json({ error: 'Path not found' });

    const updated = await prisma.learningPath.update({
      where: { id: req.params.pathId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(is_published !== undefined && { isPublished: is_published }),
        ...(order_index !== undefined && { orderIndex: order_index }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/learning-paths/:pathId
router.delete('/:pathId', requireRole('teacher'), async (req, res) => {
  try {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.pathId, teacherId: req.user.id },
    });
    if (!path) return res.status(404).json({ error: 'Path not found' });

    await prisma.learningPath.delete({ where: { id: req.params.pathId } });
    res.json({ message: 'Path deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/learning-paths/:pathId/modules
router.post('/:pathId/modules', requireRole('teacher'), async (req, res) => {
  try {
    const { title, description, order_index, unlock_condition, min_score_to_unlock } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.pathId, teacherId: req.user.id },
    });
    if (!path) return res.status(404).json({ error: 'Path not found' });

    // Auto order_index if not provided
    const count = await prisma.pathModule.count({ where: { pathId: req.params.pathId } });

    const module = await prisma.pathModule.create({
      data: {
        pathId: req.params.pathId,
        title,
        description,
        orderIndex: order_index ?? count,
        unlockCondition: unlock_condition || 'sequential',
        minScoreToUnlock: min_score_to_unlock,
      },
    });
    res.status(201).json(module);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/learning-paths/:pathId/modules/reorder
router.put('/:pathId/modules/reorder', requireRole('teacher'), async (req, res) => {
  try {
    const { modules } = req.body; // [{ id, order_index }]
    if (!Array.isArray(modules)) return res.status(400).json({ error: 'modules array required' });

    await Promise.all(
      modules.map(({ id, order_index }) =>
        prisma.pathModule.update({ where: { id }, data: { orderIndex: order_index } })
      )
    );
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/learning-paths/modules/:moduleId
router.put('/modules/:moduleId', requireRole('teacher'), async (req, res) => {
  try {
    const { title, description, unlock_condition, min_score_to_unlock } = req.body;
    const updated = await prisma.pathModule.update({
      where: { id: req.params.moduleId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(unlock_condition !== undefined && { unlockCondition: unlock_condition }),
        ...(min_score_to_unlock !== undefined && { minScoreToUnlock: min_score_to_unlock }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/learning-paths/modules/:moduleId
router.delete('/modules/:moduleId', requireRole('teacher'), async (req, res) => {
  try {
    await prisma.pathModule.delete({ where: { id: req.params.moduleId } });
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/learning-paths/modules/:moduleId/items
router.post('/modules/:moduleId/items', requireRole('teacher'), async (req, res) => {
  try {
    const { title, type, content, file_url, external_url, order_index, is_required, points } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'title and type required' });

    const count = await prisma.pathItem.count({ where: { moduleId: req.params.moduleId } });

    const item = await prisma.pathItem.create({
      data: {
        moduleId: req.params.moduleId,
        title,
        type,
        content,
        fileUrl: file_url,
        externalUrl: external_url,
        orderIndex: order_index ?? count,
        isRequired: is_required !== undefined ? is_required : true,
        points: points || 0,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/learning-paths/modules/:moduleId/items/reorder
router.put('/modules/:moduleId/items/reorder', requireRole('teacher'), async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });

    await Promise.all(
      items.map(({ id, order_index }) =>
        prisma.pathItem.update({ where: { id }, data: { orderIndex: order_index } })
      )
    );
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/learning-paths/items/:itemId
router.put('/items/:itemId', requireRole('teacher'), async (req, res) => {
  try {
    const { title, type, content, file_url, external_url, is_required, points } = req.body;
    const updated = await prisma.pathItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(content !== undefined && { content }),
        ...(file_url !== undefined && { fileUrl: file_url }),
        ...(external_url !== undefined && { externalUrl: external_url }),
        ...(is_required !== undefined && { isRequired: is_required }),
        ...(points !== undefined && { points }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/learning-paths/items/:itemId
router.delete('/items/:itemId', requireRole('teacher'), async (req, res) => {
  try {
    await prisma.pathItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/learning-paths/items/:itemId/complete — Student marks item complete
router.post('/items/:itemId/complete', requireRole('student'), async (req, res) => {
  try {
    const { score } = req.body;
    const item = await prisma.pathItem.findUnique({
      where: { id: req.params.itemId },
      include: { module: { include: { path: true } } },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const progress = await prisma.pathProgress.upsert({
      where: { studentId_itemId: { studentId: req.user.id, itemId: req.params.itemId } },
      create: {
        studentId: req.user.id,
        itemId: req.params.itemId,
        status: 'completed',
        score,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      update: { status: 'completed', score, completedAt: new Date() },
    });

    // Non-blocking XP + badge checks
    Promise.resolve().then(async () => {
      await awardXP(req.user.id, 15); // path_item_completed

      // Check if entire path is now complete
      const path = item.module.path;
      const allItems = await prisma.pathItem.findMany({
        where: { module: { pathId: path.id }, isRequired: true },
        include: { progress: { where: { studentId: req.user.id } } },
      });
      const allDone = allItems.every((i) => i.progress[0]?.status === 'completed');
      if (allDone) {
        await awardXP(req.user.id, 50); // path_completed
        await prisma.notification.create({
          data: {
            schoolId: req.user.school_id,
            recipientId: req.user.id,
            type: 'path_unlocked',
            title: `You completed "${path.title}"! 🎓`,
            body: 'Congratulations on completing the learning path!',
          },
        });
      }

      await checkAndAwardBadges(req.user.id, req.user.school_id, 'path_completion');
    });

    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/learning-paths/:pathId/progress — Teacher view
router.get('/:pathId/progress', requireRole('teacher'), async (req, res) => {
  try {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.pathId, teacherId: req.user.id },
      include: {
        modules: {
          include: {
            items: { where: { isRequired: true } },
          },
        },
        subject: {
          include: {
            class: {
              include: {
                students: { include: { student: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!path) return res.status(404).json({ error: 'Path not found' });

    const totalItems = path.modules.flatMap((m) => m.items).length;
    const itemIds = path.modules.flatMap((m) => m.items.map((i) => i.id));
    const students = path.subject.class.students.map((sc) => sc.student);

    const progressData = await Promise.all(
      students.map(async (student) => {
        const completed = await prisma.pathProgress.count({
          where: {
            studentId: student.id,
            itemId: { in: itemIds },
            status: 'completed',
          },
        });
        return {
          ...student,
          completedItems: completed,
          totalItems,
          percentage: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
        };
      })
    );

    res.json({ path: { id: path.id, title: path.title }, students: progressData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/learning-paths/:pathId/my-progress — Student view
router.get('/:pathId/my-progress', requireRole('student'), async (req, res) => {
  try {
    const path = await prisma.learningPath.findFirst({
      where: { id: req.params.pathId, schoolId: req.user.school_id, isPublished: true },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            items: {
              orderBy: { orderIndex: 'asc' },
              include: {
                progress: { where: { studentId: req.user.id } },
              },
            },
          },
        },
      },
    });
    if (!path) return res.status(404).json({ error: 'Path not found' });

    // Enrich items with status
    const enriched = {
      ...path,
      modules: path.modules.map((mod, modIndex) => {
        const prevModule = modIndex > 0 ? path.modules[modIndex - 1] : null;
        const prevCompleted = prevModule
          ? prevModule.items.every((i) => i.progress[0]?.status === 'completed')
          : true;
        const isLocked = mod.unlockCondition === 'sequential' && !prevCompleted;

        return {
          ...mod,
          isLocked,
          completionPercentage: mod.items.length > 0
            ? Math.round(
                (mod.items.filter((i) => i.progress[0]?.status === 'completed').length / mod.items.length) * 100
              )
            : 0,
          items: mod.items.map((item) => ({
            ...item,
            status: item.progress[0]?.status || 'not_started',
            score: item.progress[0]?.score,
          })),
        };
      }),
    };

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
