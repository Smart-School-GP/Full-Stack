
const { sendPushNotification } = require('./pushNotification');

const prisma = require("../lib/prisma");

async function notifyParentsOfAbsence(attendanceRecords, classId, date) {
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: { school: true },
  });

  if (!classInfo) return;

  for (const record of attendanceRecords) {
    if (record.status !== 'absent' && record.status !== 'late') continue;

    const student = await prisma.user.findUnique({
      where: { id: record.studentId },
      include: {
        studentParents: {
          include: { parent: true },
        },
      },
    });

    if (!student || !student.studentParents.length) continue;

    const parent = student.studentParents[0].parent;
    const statusText = record.status === 'absent' ? 'absent' : 'late';
    
    const notificationTitle = `Attendance Alert: ${student.name}`;
    const notificationBody = `${student.name} was marked ${statusText} on ${new Date(date).toLocaleDateString()} for ${classInfo.name}`;

    await prisma.attendanceNotification.create({
      data: {
        attendanceId: record.id,
        parentId: parent.id,
      },
    });

    await sendPushNotification(
      parent.id,
      notificationTitle,
      notificationBody,
      {
        type: 'attendance',
        studentId: student.id,
        attendanceId: record.id,
        classId,
      }
    );
  }
}

async function calculateAttendanceRate(studentId, fromDate, toDate) {
  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      date: {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      },
    },
  });

  if (records.length === 0) return null;

  const presentCount = records.filter(
    (r) => r.status === 'present' || r.status === 'late'
  ).length;

  return (presentCount / records.length) * 100;
}

module.exports = {
  notifyParentsOfAbsence,
  calculateAttendanceRate,
};
