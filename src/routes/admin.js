const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const axios = require('axios');

const { authenticate, requireRole } = require('../middleware/auth');
const { buildAnalyticsPayload, saveAnalyticsReport, getWeekStart } = require('../services/analyticsAggregator');
const { runAnalyticsForSchool } = require('../jobs/analyticsGeneration');

const prisma = require("../lib/prisma");

// All admin routes require auth + admin role
router.use(authenticate, requireRole("admin"));

// NOTE: The /schools endpoint has been removed due to privilege escalation concerns.
// School creation should be handled by a dedicated super-admin mechanism.

// POST /api/admin/users — Create user within the admin's school
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, role are required' });
    }

    const validRoles = ['teacher', 'parent', 'student', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        schoolId: req.user.school_id,
        name,
        email,
        passwordHash,
        role,
      },
      select: { id: true, name: true, email: true, role: true, schoolId: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — List all users in the admin's school
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { schoolId: req.user.school_id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.userId, schoolId: req.user.school_id },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.user.delete({ where: { id: req.params.userId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/classes — Create a class
router.post('/classes', async (req, res) => {
  try {
    const { name, grade_level } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name is required' });

    const cls = await prisma.class.create({
      data: { schoolId: req.user.school_id, name, gradeLevel: grade_level },
    });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/classes — List classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.user.school_id },
      include: {
        _count: { select: { students: true, subjects: true } },
        teachers: { include: { teacher: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/classes/:classId — Get a single class by ID
router.get('/classes/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found in your school' });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/classes/:classId/students — Enroll a student
router.post('/classes/:classId/students', async (req, res) => {
  try {
    const { student_id } = req.body;

    // Verify class belongs to school
    const cls = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    // Verify student belongs to school
    const student = await prisma.user.findFirst({
      where: { id: student_id, schoolId: req.user.school_id, role: 'student' },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.studentClass.upsert({
      where: { studentId_classId: { studentId: student_id, classId: req.params.classId } },
      create: { studentId: student_id, classId: req.params.classId },
      update: {},
    });

    res.status(201).json({ message: 'Student enrolled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/classes/:classId/students — List students in a class
router.get('/classes/:classId/students', async (req, res) => {
  try {
    const { classId } = req.params;
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found in your school' });

    const students = await prisma.studentClass.findMany({
        where: { classId: req.params.classId },
        include: {
            student: { select: { id: true, name: true, email: true } },
        },
    });
    res.json(students.map((sc) => sc.student));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/classes/:classId/teachers — Assign a teacher
router.post('/classes/:classId/teachers', async (req, res) => {
  try {
    const { teacher_id } = req.body;

    const cls = await prisma.class.findFirst({
      where: { id: req.params.classId, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const teacher = await prisma.user.findFirst({
      where: { id: teacher_id, schoolId: req.user.school_id, role: 'teacher' },
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    await prisma.teacherClass.upsert({
      where: { teacherId_classId: { teacherId: teacher_id, classId: req.params.classId } },
      create: { teacherId: teacher_id, classId: req.params.classId },
      update: {},
    });

    res.status(201).json({ message: 'Teacher assigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/parent-student — Link parent to student
router.post('/parent-student', async (req, res) => {
  try {
    const { parent_id, student_id } = req.body;

    const parent = await prisma.user.findFirst({
      where: { id: parent_id, schoolId: req.user.school_id, role: 'parent' },
    });
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    const student = await prisma.user.findFirst({
      where: { id: student_id, schoolId: req.user.school_id, role: 'student' },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parent_id, studentId: student_id } },
      create: { parentId: parent_id, studentId: student_id },
      update: {},
    });

    res.status(201).json({ message: 'Parent-student relationship created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/school — School-wide performance
router.get('/reports/school', async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const totalStudents = await prisma.user.count({
      where: { schoolId, role: 'student' },
    });

    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          include: {
            student: {
              include: {
                finalGrades: true,
              },
            },
          },
        },
        subjects: true,
      },
    });

    const classAverages = classes.map((cls) => {
      const allGrades = cls.students.flatMap((sc) =>
        sc.student.finalGrades.map((fg) => fg.finalScore).filter((s) => s !== null)
      );
      const avg =
        allGrades.length > 0
          ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length
          : null;
      return { class_id: cls.id, class_name: cls.name, average: avg, student_count: cls.students.length };
    });

    // At-risk students: final grade < 50 in any subject
    const atRiskData = await prisma.finalGrade.findMany({
      where: {
        finalScore: { lt: 50 },
        student: { schoolId },
      },
      include: {
        student: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    const atRiskMap = {};
    for (const fg of atRiskData) {
      if (!atRiskMap[fg.studentId]) {
        atRiskMap[fg.studentId] = { student: fg.student, failing_subjects: [] };
      }
      atRiskMap[fg.studentId].failing_subjects.push({
        subject: fg.subject.name,
        score: fg.finalScore,
      });
    }

    res.json({
      total_students: totalStudents,
      class_averages: classAverages,
      at_risk_students: Object.values(atRiskMap),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/risk-overview — School-wide risk summary
router.get('/risk-overview', async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const allRisk = await prisma.riskScore.findMany({
      where: { student: { schoolId } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentClasses: { include: { class: { select: { id: true, name: true } } } },
          },
        },
        subject: { select: { name: true } },
      },
    });

    const high = allRisk.filter((r) => r.riskLevel === 'high');
    const medium = allRisk.filter((r) => r.riskLevel === 'medium');

    const classMap = {};
    for (const r of allRisk) {
      if (r.riskLevel === 'low') continue;
      for (const sc of r.student.studentClasses) {
        const cid = sc.class.id;
        if (!classMap[cid]) classMap[cid] = { class_name: sc.class.name, at_risk_count: 0 };
        classMap[cid].at_risk_count++;
      }
    }

    res.json({
      total_at_risk: high.length + medium.length,
      high_risk: high.length,
      medium_risk: medium.length,
      by_class: Object.values(classMap),
      top_at_risk: high.slice(0, 10).map((r) => ({
        student_id: r.studentId,
        student_name: r.student.name,
        subject_name: r.subject.name,
        risk_score: r.riskScore,
        calculated_at: r.calculatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ANALYTICS ENDPOINTS ──────────────────────────────────────────────────────

// GET /api/admin/analytics/latest — most recent report for this school
router.get('/analytics/latest', async (req, res) => {
  try {
    const report = await prisma.analyticsReport.findFirst({
      where: { schoolId: req.user.school_id },
      orderBy: { generatedAt: 'desc' },
    });

    if (!report) return res.json({ report: null });

    res.json({
      report: {
        ...report,
        recommendedActions: JSON.parse(report.recommendedActions || '[]'),
        subjectInsightsJson: JSON.parse(report.subjectInsightsJson || '[]'),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/analytics/generate — manually trigger report generation
router.post('/analytics/generate', async (req, res) => {
  try {
    runAnalyticsForSchool(req.user.school_id);
    res.json({ message: 'Analytics generation started. The report will be available shortly.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
