const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getStudentXPData } = require('../services/xpService');
const prisma = require('../lib/prisma');

router.use(authenticate);

// GET /api/xp/me — current student's own XP data
router.get('/me', async (req, res) => {
  try {
    const xp = await getStudentXPData(req.user.id);
    res.json(xp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/xp/student/:studentId
router.get('/student/:studentId', async (req, res) => {
  try {
    const student = await prisma.user.findFirst({
      where: { id: req.params.studentId, schoolId: req.user.school_id },
      select: { id: true, name: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const xp = await getStudentXPData(req.params.studentId);
    res.json({ ...student, ...xp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/xp/leaderboard/:classId
router.get('/leaderboard/:classId', async (req, res) => {
  try {
    const classStudents = await prisma.studentClass.findMany({
      where: { classId: req.params.classId },
      include: {
        student: {
          select: { id: true, name: true },
        },
      },
    });

    const studentIds = classStudents.map((sc) => sc.student.id);

    const xpRecords = await prisma.studentXP.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { totalXP: 'desc' },
      take: 10,
    });

    const badgeCounts = await Promise.all(
      studentIds.map(async (id) => ({
        id,
        count: await prisma.studentBadge.count({ where: { studentId: id } }),
      }))
    );
    const badgeMap = Object.fromEntries(badgeCounts.map((b) => [b.id, b.count]));
    const studentMap = Object.fromEntries(classStudents.map((sc) => [sc.student.id, sc.student]));

    const leaderboard = xpRecords.map((xp, rank) => ({
      rank: rank + 1,
      ...studentMap[xp.studentId],
      totalXP: xp.totalXP,
      level: xp.level,
      currentStreak: xp.currentStreak,
      badgeCount: badgeMap[xp.studentId] || 0,
    }));

    // Add students with no XP record at the bottom
    const hasXP = new Set(xpRecords.map((x) => x.studentId));
    const noXPStudents = classStudents
      .filter((sc) => !hasXP.has(sc.student.id))
      .map((sc, i) => ({
        rank: leaderboard.length + i + 1,
        ...sc.student,
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        badgeCount: badgeMap[sc.student.id] || 0,
      }));

    res.json([...leaderboard, ...noXPStudents]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
