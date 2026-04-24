const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");


const router = express.Router();
router.use(authenticate);
const prisma = require("../lib/prisma");

router.get("/student/:studentId/grades", requireRole("student", "parent", "teacher", "admin"), async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify the target student belongs to the requester's school
    const student = await prisma.user.findFirst({
      where: { id: studentId, schoolId: req.user.school_id },
      select: { id: true },
    });
    if (!student) return res.status(403).json({ error: 'Access denied' });

    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        assignment: {
          include: { subject: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = grades.map((g) => ({
      subject: g.assignment.subject.name,
      assignment: g.assignment.title,
      score: g.score,
      maxScore: g.assignment.maxScore,
      date: g.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Export grades error:', err);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

router.get("/student/:studentId/attendance", requireRole("student", "parent", "teacher", "admin"), async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify the target student belongs to the requester's school
    const student = await prisma.user.findFirst({
      where: { id: studentId, schoolId: req.user.school_id },
      select: { id: true },
    });
    if (!student) return res.status(403).json({ error: 'Access denied' });

    const attendance = await prisma.attendance.findMany({
      where: { studentId },
      include: { class: true },
      orderBy: { date: 'desc' },
    });

    const formatted = attendance.map((a) => ({
      date: a.date,
      status: a.status,
      class: a.class.name,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Export attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.get("/class/:classId/report", requireRole("teacher", "admin"), async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify class belongs to requester's school
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.school_id },
      select: { id: true },
    });
    if (!classRecord) return res.status(403).json({ error: 'Access denied' });

    const students = await prisma.user.findMany({
      where: {
        studentClasses: { some: { classId } },
      },
      include: {
        finalGrades: {
          include: { subject: true },
        },
        attendance: {
          where: { classId },
        },
      },
    });

    const classInfo = await prisma.class.findUnique({ where: { id: classId } });

    const formatted = students.map((s) => {
      const totalScore = s.finalGrades.reduce((sum, fg) => sum + (fg.finalScore || 0), 0);
      const avgScore = s.finalGrades.length > 0 ? totalScore / s.finalGrades.length : 0;

      const present = s.attendance.filter((a) => a.status === 'present').length;
      const total = s.attendance.length;
      const attendance = total > 0 ? `${((present / total) * 100).toFixed(0)}%` : 'N/A';

      return {
        name: s.name,
        averageScore: avgScore,
        attendance,
      };
    });

    res.json({
      className: classInfo?.name,
      students: formatted,
    });
  } catch (err) {
    console.error('Export class report error:', err);
    res.status(500).json({ error: 'Failed to fetch class report' });
  }
});

// GET /api/export/school/at-risk — At-risk students list (Admin)
router.get("/school/at-risk", requireRole("admin"), async (req, res) => {
  try {
    const riskScores = await prisma.riskScore.findMany({
      where: {
        student: { schoolId: req.user.school_id },
        riskLevel: { in: ['high', 'medium'] },
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ riskLevel: 'asc' }, { riskScore: 'desc' }],
    });

    const formatted = riskScores.map((rs) => ({
      student: rs.student.name,
      email: rs.student.email,
      subject: rs.subject.name,
      riskLevel: rs.riskLevel,
      riskScore: rs.riskScore,
      calculatedAt: rs.calculatedAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Export at-risk error:', err);
    res.status(500).json({ error: 'Failed to fetch at-risk students' });
  }
});

// GET /api/export/attendance/:classId — Attendance export (Teacher, Admin)
router.get("/attendance/:classId", requireRole("teacher", "admin"), async (req, res) => {
  try {
    const { classId } = req.params;
    const { from, to } = req.query;

    // Verify class belongs to school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.school_id },
    });
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const where = { classId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { student: { name: 'asc' } }],
    });

    const formatted = records.map((r) => ({
      student: r.student.name,
      date: r.date,
      status: r.status,
      note: r.note || '',
    }));

    res.json({ className: cls.name, records: formatted });
  } catch (err) {
    console.error('Export attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.get("/analytics/:schoolId", requireRole("admin"), async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (schoolId !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reports = await prisma.analyticsReport.findMany({
      where: { schoolId },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });

    res.json(reports);
  } catch (err) {
    console.error('Export analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
