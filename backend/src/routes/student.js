const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

router.use(authenticate, requireRole('student'));

// GET /api/student/grades
router.get('/grades', async (req, res) => {
  try {
    const finalGrades = await prisma.finalGrade.findMany({
      where: { studentId: req.user.id },
      include: { subject: { include: { class: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(finalGrades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/subjects/:subjectId/details
router.get('/subjects/:subjectId/details', async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { subjectId: req.params.subjectId },
      orderBy: { createdAt: 'asc' },
    });

    const grades = await prisma.grade.findMany({
      where: {
        studentId: req.user.id,
        assignmentId: { in: assignments.map((a) => a.id) },
      },
    });

    const gradeMap = {};
    grades.forEach((g) => (gradeMap[g.assignmentId] = g.score));

    const finalGrade = await prisma.finalGrade.findUnique({
      where: { studentId_subjectId: { studentId: req.user.id, subjectId: req.params.subjectId } },
    });

    res.json({
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        score: gradeMap[a.id] ?? null,
        max_score: a.maxScore,
        date: a.createdAt,
      })),
      final_score: finalGrade?.finalScore ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
