const prisma = require('../lib/prisma');
const { notifyParentsOfAbsence } = require('./attendanceNotifier');
const logger = require('../lib/logger');

/**
 * Mark or update attendance for a class on a specific date.
 */
async function markAttendance(schoolId, teacherId, role, attendanceData) {
  const { class_id, date, records } = attendanceData;

  const classExists = await prisma.class.findFirst({
    where: { id: class_id, schoolId },
  });
  if (!classExists) return { error: 'NOT_FOUND', message: 'Class not found in your school' };

  if (role !== 'admin') {
    const teacherClass = await prisma.teacherClass.findFirst({
      where: { teacherId, classId: class_id },
    });
    if (!teacherClass) return { error: 'FORBIDDEN', message: 'Not assigned to this class' };
  }

  const attendanceRecords = await Promise.all(
    records.map(async (record) => {
      const student = await prisma.user.findFirst({
        where: { id: record.student_id, schoolId, role: 'student' },
      });
      if (!student) {
        logger.warn('[Attendance] Student not found or not in school', { 
          studentId: record.student_id, 
          schoolId 
        });
        return null;
      }

      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      const existing = await prisma.attendance.findUnique({
        where: {
          studentId_date: {
            studentId: record.student_id,
            date: attendanceDate,
          },
        },
      });

      if (existing) {
        return prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: record.status,
            note: record.note,
            markedBy: teacherId,
          },
        });
      }

      return prisma.attendance.create({
        data: {
          schoolId,
          studentId: record.student_id,
          classId: class_id,
          date: attendanceDate,
          status: record.status,
          note: record.note,
          markedBy: teacherId,
        },
      });
    })
  );

  const validAttendanceRecords = attendanceRecords.filter(record => record !== null);
  if (validAttendanceRecords.length > 0) {
    // Fire and forget notification
    notifyParentsOfAbsence(validAttendanceRecords, class_id, date).catch(err => {
        logger.error('[Attendance] Notification failed', { error: err.message });
    });
  }

  return { success: true, data: attendanceRecords };
}

/**
 * Get attendance history for a class.
 */
async function getClassAttendance(classId, from, to) {
  const where = { classId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  return prisma.attendance.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });
}

/**
 * Get today's attendance status for all students in a class.
 */
async function getTodayAttendance(classId) {
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

  return students.map((sc) => {
    const record = attendance.find((a) => a.studentId === sc.student.id);
    return {
      student: sc.student,
      status: record?.status || 'pending',
      note: record?.note,
      attendanceId: record?.id,
    };
  });
}

/**
 * Get attendance records and summary for a specific student.
 */
async function getStudentAttendance(studentId, from, to) {
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
  const summary = {
    total,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    excused: records.filter((r) => r.status === 'excused').length,
  };
  summary.rate = total > 0 ? ((summary.present + summary.late) / total) * 100 : 0;

  return { records, summary };
}

/**
 * Update a single attendance record.
 */
async function updateAttendanceRecord(attendanceId, status, note) {
  return prisma.attendance.update({
    where: { id: attendanceId },
    data: { status, note },
  });
}

/**
 * Verify if a parent is authorized to view a student's attendance.
 */
async function isParentAuthorized(parentId, studentId) {
  const parentStudent = await prisma.parentStudent.findFirst({
    where: { parentId, studentId },
  });
  return !!parentStudent;
}

module.exports = {
  markAttendance,
  getClassAttendance,
  getTodayAttendance,
  getStudentAttendance,
  updateAttendanceRecord,
  isParentAuthorized,
};
