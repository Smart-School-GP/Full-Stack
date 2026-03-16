const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');

const prisma = require("../lib/prisma");

router.use(authenticate, requireRole('parent'));

// Helper: Verify parent-student relationship and school
async function verifyParentStudent(parentId, studentId, schoolId) {
  const rel = await prisma.parentStudent.findFirst({
    where: { parentId, studentId },
    include: { student: true },
  });
  if (!rel || rel.student.schoolId !== schoolId) return null;
  return rel;
}

// GET /api/parent/children
router.get('/children', async (req, res) => {
  try {
    const relations = await prisma.parentStudent.findMany({
      where: { parentId: req.user.id },
      include: {
        student: {
          include: {
            finalGrades: {
              include: { subject: true },
            },
            studentClasses: {
              include: { class: true },
            },
          },
        },
      },
    });
    res.json(relations.map((r) => r.student));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parent/children/:studentId/grades
router.get('/children/:studentId/grades', async (req, res) => {
  try {
    const rel = await verifyParentStudent(req.user.id, req.params.studentId, req.user.school_id);
    if (!rel) return res.status(403).json({ error: 'Access denied' });

    const finalGrades = await prisma.finalGrade.findMany({
      where: { studentId: req.params.studentId },
      include: { subject: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      subjects: finalGrades.map((fg) => ({
        subject_id: fg.subjectId,
        name: fg.subject.name,
        final_score: fg.finalScore,
        last_updated: fg.updatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/parent/children/:studentId/subjects/:subjectId/details
router.get('/children/:studentId/subjects/:subjectId/details', async (req, res) => {
  try {
    const rel = await verifyParentStudent(req.user.id, req.params.studentId, req.user.school_id);
    if (!rel) return res.status(403).json({ error: 'Access denied' });

    const assignments = await prisma.assignment.findMany({
      where: { subjectId: req.params.subjectId },
      orderBy: { createdAt: 'asc' },
    });

    const grades = await prisma.grade.findMany({
      where: {
        studentId: req.params.studentId,
        assignmentId: { in: assignments.map((a) => a.id) },
      },
    });

    const gradeMap = {};
    grades.forEach((g) => (gradeMap[g.assignmentId] = g.score));

    const finalGrade = await prisma.finalGrade.findUnique({
      where: { studentId_subjectId: { studentId: req.params.studentId, subjectId: req.params.subjectId } },
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

// GET /api/parent/children/:studentId/history
router.get('/children/:studentId/history', async (req, res) => {
  try {
    const rel = await verifyParentStudent(req.user.id, req.params.studentId, req.user.school_id);
    if (!rel) return res.status(403).json({ error: 'Access denied' });

    const history = await prisma.finalGrade.findMany({
      where: { studentId: req.params.studentId },
      include: { subject: true },
      orderBy: { updatedAt: 'asc' },
    });

    res.json({
      history: history.map((fg) => ({
        subject: fg.subject.name,
        score: fg.finalScore,
        date: fg.updatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
