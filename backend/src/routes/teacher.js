const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const { recalculateFinalGrade } = require('../services/gradeCalculator');

const prisma = new PrismaClient();

router.use(authenticate, requireRole('teacher'));

// GET /api/teacher/classes
router.get('/classes', async (req, res) => {
  try {
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId: req.user.id },
      include: {
        class: {
          include: {
            _count: { select: { students: true, subjects: true } },
          },
        },
      },
    });
    res.json(teacherClasses.map((tc) => tc.class));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/classes/:classId/students
router.get('/classes/:classId/students', async (req, res) => {
  try {
    // Verify teacher is assigned to this class
    const assignment = await prisma.teacherClass.findFirst({
      where: { teacherId: req.user.id, classId: req.params.classId },
    });
    if (!assignment) return res.status(403).json({ error: 'Not assigned to this class' });

    const students = await prisma.studentClass.findMany({
      where: { classId: req.params.classId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    res.json(students.map((sc) => sc.student));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/classes/:classId/subjects
router.get('/classes/:classId/subjects', async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { classId: req.params.classId, teacherId: req.user.id },
      include: {
        gradingAlgorithm: true,
        _count: { select: { assignments: true } },
      },
    });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/subjects
router.post('/subjects', async (req, res) => {
  try {
    const { class_id, name } = req.body;
    if (!class_id || !name) return res.status(400).json({ error: 'class_id and name required' });

    // Verify teacher is assigned to this class
    const cls = await prisma.class.findFirst({
      where: { id: class_id, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const subject = await prisma.subject.create({
      data: { classId: class_id, teacherId: req.user.id, name },
    });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teacher/subjects/:subjectId/algorithm
router.put('/subjects/:subjectId/algorithm', async (req, res) => {
  try {
    const { weights } = req.body;
    if (!weights) return res.status(400).json({ error: 'weights required' });

    const subject = await prisma.subject.findFirst({
      where: { id: req.params.subjectId, teacherId: req.user.id },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const algorithm = await prisma.gradingAlgorithm.upsert({
      where: { subjectId: req.params.subjectId },
      create: { subjectId: req.params.subjectId, weights },
      update: { weights },
    });

    res.json(algorithm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/assignments
router.post('/assignments', async (req, res) => {
  try {
    const { subject_id, title, type, max_score } = req.body;
    if (!subject_id || !title || !type) {
      return res.status(400).json({ error: 'subject_id, title, type required' });
    }

    const subject = await prisma.subject.findFirst({
      where: { id: subject_id, teacherId: req.user.id },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const assignment = await prisma.assignment.create({
      data: { subjectId: subject_id, title, type, maxScore: max_score || 100 },
    });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/subjects/:subjectId/assignments
router.get('/subjects/:subjectId/assignments', async (req, res) => {
  try {
    const subject = await prisma.subject.findFirst({
      where: { id: req.params.subjectId, teacherId: req.user.id },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const assignments = await prisma.assignment.findMany({
      where: { subjectId: req.params.subjectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/grades — Enter grade
router.post('/grades', async (req, res) => {
  try {
    const { student_id, assignment_id, score } = req.body;
    if (student_id === undefined || !assignment_id || score === undefined) {
      return res.status(400).json({ error: 'student_id, assignment_id, score required' });
    }

    // Verify assignment belongs to teacher's subject
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignment_id, subject: { teacherId: req.user.id } },
      include: { subject: true },
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    if (score < 0 || score > assignment.maxScore) {
      return res.status(400).json({ error: `Score must be between 0 and ${assignment.maxScore}` });
    }

    const grade = await prisma.grade.upsert({
      where: { studentId_assignmentId: { studentId: student_id, assignmentId: assignment_id } },
      create: { studentId: student_id, assignmentId: assignment_id, score },
      update: { score },
    });

    // Trigger recalculation
    await recalculateFinalGrade(student_id, assignment.subjectId);

    res.status(201).json(grade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teacher/grades/:gradeId — Update grade
router.put('/grades/:gradeId', async (req, res) => {
  try {
    const { score } = req.body;
    if (score === undefined) return res.status(400).json({ error: 'score required' });

    const grade = await prisma.grade.findFirst({
      where: { id: req.params.gradeId },
      include: {
        assignment: { include: { subject: true } },
      },
    });
    if (!grade) return res.status(404).json({ error: 'Grade not found' });

    // Verify teacher owns this subject
    if (grade.assignment.subject.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.grade.update({
      where: { id: req.params.gradeId },
      data: { score },
    });

    await recalculateFinalGrade(grade.studentId, grade.assignment.subjectId);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/subjects/:subjectId — Full subject detail with grades
router.get('/subjects/:subjectId', async (req, res) => {
  try {
    const subject = await prisma.subject.findFirst({
      where: { id: req.params.subjectId, teacherId: req.user.id },
      include: {
        gradingAlgorithm: true,
        assignments: true,
        class: {
          include: {
            students: {
              include: { student: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // Get all grades for this subject
    const grades = await prisma.grade.findMany({
      where: { assignment: { subjectId: req.params.subjectId } },
    });

    const finalGrades = await prisma.finalGrade.findMany({
      where: { subjectId: req.params.subjectId },
    });

    res.json({ ...subject, grades, finalGrades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/subjects/:subjectId/analytics
router.get('/subjects/:subjectId/analytics', async (req, res) => {
  try {
    const subject = await prisma.subject.findFirst({
      where: { id: req.params.subjectId, teacherId: req.user.id },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const finalGrades = await prisma.finalGrade.findMany({
      where: { subjectId: req.params.subjectId, finalScore: { not: null } },
      include: { student: { select: { id: true, name: true } } },
    });

    const scores = finalGrades.map((fg) => fg.finalScore);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const highest = scores.length > 0 ? Math.max(...scores) : null;
    const lowest = scores.length > 0 ? Math.min(...scores) : null;
    const belowPassing = finalGrades.filter((fg) => fg.finalScore < 50);

    res.json({
      class_average: avg,
      highest_score: highest,
      lowest_score: lowest,
      students_below_passing: belowPassing.map((fg) => ({
        student: fg.student,
        score: fg.finalScore,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
