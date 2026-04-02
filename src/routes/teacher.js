const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { recalculateFinalGrade, validateWeights } = require('../services/gradeCalculator');

const prisma = require("../lib/prisma");

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
    const classInfo = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.user.school_id },
    });
    if (!classInfo) return res.status(404).json({ error: 'Class not found in your school' });

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

    try {
      validateWeights(weights);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const subject = await prisma.subject.findFirst({
      where: { id: req.params.subjectId, teacherId: req.user.id },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const weightsJson = JSON.stringify(weights);
    const algorithm = await prisma.gradingAlgorithm.upsert({
      where: { subjectId: req.params.subjectId },
      create: { subjectId: req.params.subjectId, weights: weightsJson },
      update: { weights: weightsJson },
    });

    res.json(algorithm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/assignments
router.post('/assignments', async (req, res) => {
  try {
    const { subject_id, title, type, max_score, due_date, submission_type, instructions } = req.body;
    if (!subject_id || !title || !type) {
      return res.status(400).json({ error: 'subject_id, title, type required' });
    }

    const subject = await prisma.subject.findFirst({
      where: { id: subject_id, teacherId: req.user.id },
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const assignment = await prisma.assignment.create({
      data: { 
        subjectId: subject_id, 
        title, 
        type, 
        maxScore: max_score || 100,
        dueDate: due_date ? new Date(due_date) : null,
        submissionType: submission_type || 'both',
        instructions,
      },
    });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teacher/assignments/:assignmentId
router.put('/assignments/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { due_date, submission_type, instructions, max_score, title } = req.body;

    const assignment = await prisma.assignment.findFirst({
      where: { 
        id: assignmentId,
        subject: { teacherId: req.user.id },
      },
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: title || assignment.title,
        maxScore: max_score !== undefined ? max_score : assignment.maxScore,
        dueDate: due_date !== undefined ? (due_date ? new Date(due_date) : null) : assignment.dueDate,
        submissionType: submission_type || assignment.submissionType,
        instructions: instructions !== undefined ? instructions : assignment.instructions,
      },
    });
    res.json(updated);
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

// GET /api/teacher/parents — Parents of students in teacher's classes
router.get('/parents', async (req, res) => {
  try {
    // Get all classes for this teacher
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId: req.user.id },
      select: { classId: true },
    })
    const classIds = teacherClasses.map(tc => tc.classId)

    // Get all students in those classes
    const studentClasses = await prisma.studentClass.findMany({
      where: { classId: { in: classIds } },
      select: { studentId: true },
    })
    const studentIds = [...new Set(studentClasses.map(sc => sc.studentId))]

    // Get all parents linked to those students
    const parentStudents = await prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        parent: { select: { id: true, name: true, email: true } },
      },
    })

    // Deduplicate parents
    const parentMap = {}
    parentStudents.forEach(ps => {
      parentMap[ps.parentId] = ps.parent
    })

    res.json(Object.values(parentMap))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/teacher/risk-alerts — At-risk students in teacher's classes
router.get('/risk-alerts', async (req, res) => {
  try {
    // Get all subjects taught by this teacher
    const subjects = await prisma.subject.findMany({
      where: { teacherId: req.user.id },
      select: { id: true, name: true },
    });
    const subjectIds = subjects.map((s) => s.id);

    const riskScores = await prisma.riskScore.findMany({
      where: {
        subjectId: { in: subjectIds },
        riskLevel: { in: ['high', 'medium'] },
      },
      include: {
        student: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { riskScore: 'desc' },
    });

    // Enrich with current grade and 7d change
    const alerts = await Promise.all(
      riskScores.map(async (rs) => {
        const finalGrade = await prisma.finalGrade.findUnique({
          where: {
            studentId_subjectId: { studentId: rs.studentId, subjectId: rs.subjectId },
          },
        });

        const recentGrades = await prisma.grade.findMany({
          where: { studentId: rs.studentId, assignment: { subjectId: rs.subjectId } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { assignment: true },
        });

        const oldGrades = await prisma.grade.findMany({
          where: {
            studentId: rs.studentId,
            assignment: { subjectId: rs.subjectId },
            createdAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          include: { assignment: true },
        });

        const recentAvg =
          recentGrades.length > 0
            ? recentGrades.reduce(
                (sum, g) => sum + (g.score / g.assignment.maxScore) * 100,
                0
              ) / recentGrades.length
            : null;
        const oldAvg =
          oldGrades.length > 0
            ? oldGrades.reduce(
                (sum, g) => sum + (g.score / g.assignment.maxScore) * 100,
                0
              ) / oldGrades.length
            : null;

        return {
          student_id: rs.studentId,
          student_name: rs.student.name,
          subject_id: rs.subjectId,
          subject_name: rs.subject.name,
          risk_score: rs.riskScore,
          risk_level: rs.riskLevel,
          trend: rs.trend ?? 'stable',
          confidence: rs.confidence ?? null,
          current_grade: finalGrade?.finalScore ?? null,
          grade_change_7d: recentAvg !== null && oldAvg !== null ? recentAvg - oldAvg : null,
          calculated_at: rs.calculatedAt,
        };
      })
    );

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/risk-alerts/trigger — Manually trigger risk analysis (dev/testing)
router.post('/risk-alerts/trigger', async (req, res) => {
  try {
    const { runRiskAnalysis } = require('../jobs/riskAnalysis');
    runRiskAnalysis(); // fire and forget
    res.json({ message: 'Risk analysis triggered. Check back in a moment.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
