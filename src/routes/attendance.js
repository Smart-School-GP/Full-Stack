const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { notifyParentsOfAbsence } = require('../services/attendanceNotifier');

const prisma = require("../lib/prisma");

router.use(authenticate);

router.post('/', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { class_id, date, records } = req.body;
    
    if (!class_id || !date || !records || !records.length) {
      return res.status(400).json({ error: 'class_id, date, and records required' });
    }

    const classExists = await prisma.class.findFirst({
      where: { id: class_id, schoolId: req.user.school_id },
    });
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found in your school' });
    }

    const teacherClass = await prisma.teacherClass.findFirst({
      where: { teacherId: req.user.id, classId: class_id },
    });

    if (!teacherClass && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not assigned to this class' });
    }

    const attendanceRecords = await Promise.all(
      records.map(async (record) => {
        // Verify student belongs to the same school
        const student = await prisma.user.findFirst({
          where: { id: record.student_id, schoolId: req.user.school_id, role: 'student' },
        });
        if (!student) {
          console.warn(`[Attendance] Student ${record.student_id} not found in school ${req.user.school_id} or not a student role.`);
          return null; // Skip this record if student not found or not in school
        }

        const existing = await prisma.attendance.findUnique({
          where: {
            studentId_date: {
              studentId: record.student_id,
              date: new Date(date),
            },
          },
        });

        if (existing) {
          return prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status: record.status,
              note: record.note,
              markedBy: req.user.id,
            },
          });
        }

        return prisma.attendance.create({
          data: {
            schoolId: req.user.school_id,
            studentId: record.student_id,
            classId: class_id,
            date: new Date(date),
            status: record.status,
            note: record.note,
            markedBy: req.user.id,
          },
        });
      })
    );

    const validAttendanceRecords = attendanceRecords.filter(record => record !== null);
    if (validAttendanceRecords.length > 0) {
      await notifyParentsOfAbsence(validAttendanceRecords, class_id, date);
    }

    res.json(attendanceRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { from, to } = req.query;

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
      orderBy: { date: 'desc' },
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/today/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const students = await prisma.studentClass.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, name: true } },
      },
    });

    const attendance = await prisma.attendance.findMany({
      where: {
        classId,
        date: { gte: today },
      },
    });

    const result = students.map((sc) => {
      const record = attendance.find((a) => a.studentId === sc.student.id);
      return {
        student: sc.student,
        status: record?.status || 'pending',
        note: record?.note,
        attendanceId: record?.id,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { from, to } = req.query;

    if (req.user.role === 'parent') {
      const parentStudent = await prisma.parentStudent.findFirst({
        where: { parentId: req.user.id, studentId },
      });
      if (!parentStudent) {
        return res.status(403).json({ error: 'Not your child' });
      }
    }

    const where = { studentId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;

    res.json({
      records,
      summary: {
        total,
        present,
        absent,
        late,
        excused,
        rate: total > 0 ? ((present + late) / total) * 100 : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:attendanceId', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, note } = req.body;

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { status, note },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
