const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/student/:studentId/grades', async (req, res) => {
  try {
    const { studentId } = req.params;

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

router.get('/student/:studentId/attendance', async (req, res) => {
  try {
    const { studentId } = req.params;

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

router.get('/class/:classId/report', async (req, res) => {
  try {
    const { classId } = req.params;

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

router.get('/analytics/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;

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
