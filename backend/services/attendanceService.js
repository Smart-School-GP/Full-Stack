const prisma = require('../lib/prisma');
const { notifyParentsOfAbsence } = require('./attendanceNotifier');
const logger = require('../lib/logger');
const { awardXP, XP_REWARDS } = require('./xpService');
const { checkAndAwardBadges } = require('./badgeEngine');

/**
 * Mark or update attendance for a room on a specific date.
 */
async function markAttendance(teacherId, role, attendanceData) {
  const { room_id, date, records } = attendanceData;

  const roomExists = await prisma.room.findFirst({
    where: { id: room_id },
  });
  if (!roomExists) return { error: 'NOT_FOUND', message: 'Room not found' };

  if (role !== 'admin') {
    const teacherRoom = await prisma.teacherRoom.findFirst({
      where: { teacherId, roomId: room_id },
    });
    if (!teacherRoom) return { error: 'FORBIDDEN', message: 'Not assigned to this room' };
  }

  const attendanceRecords = await Promise.all(
    records.map(async (record) => {
      const student = await prisma.user.findFirst({
        where: { id: record.student_id, role: 'student' },
      });
      if (!student) {
        logger.warn('[Attendance] Student not found', { 
          studentId: record.student_id, 
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
          studentId: record.student_id,
          roomId: room_id,
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
    notifyParentsOfAbsence(validAttendanceRecords, room_id, date).catch(err => {
        logger.error('[Attendance] Notification failed', { error: err.message });
    });

    // Fire and forget XP and Badges
    Promise.resolve().then(async () => {
      try {
        for (const record of validAttendanceRecords) {
          if (record.status === 'present' || record.status === 'late') {
            await awardXP(record.studentId, XP_REWARDS.attendance_present, 'attendance_present');
          }
          await checkAndAwardBadges(record.studentId, 'attendance_rate');
        }
      } catch (err) {
        logger.error('[Attendance] Background XP processing failed', { error: err.message });
      }
    });
  }

  return { success: true, data: attendanceRecords };
}

/**
 * Get attendance history for a room.
 */
async function getRoomAttendance(roomId, from, to) {
  const where = { roomId };
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
 * Get today's attendance status for all students in a room.
 */
async function getTodayAttendance(roomId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const students = await prisma.studentRoom.findMany({
    where: { roomId },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  const attendance = await prisma.attendance.findMany({
    where: {
      roomId,
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
      room: { select: { id: true, name: true } },
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
  getRoomAttendance,
  getTodayAttendance,
  getStudentAttendance,
  updateAttendanceRecord,
  isParentAuthorized,
};
