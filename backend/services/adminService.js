const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { ValidationError, NotFoundError } = require('../lib/errors');

/**
 * Compute school-wide performance report.
 * Previously lived inline in the /reports/school route handler.
 *
 * Returns room averages and a deduplicated list of at-risk students.
 */
async function getSchoolReport() {
  const [totalStudents, rooms, atRiskData] = await Promise.all([
    prisma.user.count({ where: { role: 'student' } }),

    prisma.room.findMany({
      where: {},
      select: {
        id: true,
        name: true,
        students: {
          select: {
            student: {
              select: {
                finalGrades: { select: { finalScore: true } },
              },
            },
          },
        },
        _count: { select: { students: true } },
      },
    }),

    prisma.finalGrade.findMany({
      where: {
        finalScore: { lt: 50 },
      },
      select: {
        studentId: true,
        finalScore: true,
        student: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
  ]);

  const roomAverages = rooms.map((cls) => {
    const allGrades = cls.students.flatMap((sc) =>
      sc.student.finalGrades
        .map((fg) => fg.finalScore)
        .filter((s) => s !== null)
    );
    const avg =
      allGrades.length > 0
        ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length
        : null;
    return {
      room_id: cls.id,
      room_name: cls.name,
      average: avg,
      student_count: cls._count.students,
    };
  });

  // Deduplicate at-risk students, collecting all failing subjects per student
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

  return {
    total_students: totalStudents,
    room_averages: roomAverages,
    at_risk_students: Object.values(atRiskMap),
  };
}

/**
 * Compute school-wide risk overview summary.
 * Previously lived inline in the /risk-overview route handler.
 */
async function getRiskOverview() {
  const allRisk = await prisma.riskScore.findMany({
    where: {},
    select: {
      studentId: true,
      subjectId: true,
      riskLevel: true,
      riskScore: true,
      calculatedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          studentRoomes: {
            select: { room: { select: { id: true, name: true } } },
          },
        },
      },
      subject: { select: { name: true } },
    },
  });

  const high = allRisk.filter((r) => r.riskLevel === 'high');
  const medium = allRisk.filter((r) => r.riskLevel === 'medium');

  // Aggregate at-risk counts per room
  const roomMap = {};
  for (const r of allRisk) {
    if (r.riskLevel === 'low') continue;
    for (const sc of r.student.studentRoomes) {
      const cid = sc.room.id;
      if (!roomMap[cid]) {
        roomMap[cid] = { room_name: sc.room.name, at_risk_count: 0 };
      }
      roomMap[cid].at_risk_count++;
    }
  }

  return {
    total_at_risk: high.length + medium.length,
    high_risk: high.length,
    medium_risk: medium.length,
    by_room: Object.values(roomMap),
    top_at_risk: high.slice(0, 10).map((r) => ({
      student_id: r.studentId,
      student_name: r.student.name,
      subject_name: r.subject.name,
      risk_score: r.riskScore,
      calculated_at: r.calculatedAt,
    })),
  };
}

/**
 * Aggregate subject-level analytics for the analytics dashboard.
 * Previously lived inline in the /analytics/subjects route handler.
 */
async function getSubjectAnalytics() {
  const insights = await prisma.subjectInsight.findMany({
    where: {},
    select: {
      subjectId: true,
      roomId: true,
      averageScore: true,
      trend: true,
      insightText: true,
      subject: { select: { name: true } },
      room: { select: { name: true } },
    },
    orderBy: { generatedAt: 'desc' },
  });

  const reportData = insights.map((insight) => ({
    subject_id: insight.subjectId,
    room_id: insight.roomId,
    subject_name: insight.subject.name,
    room_name: insight.room.name,
    average_score: insight.averageScore,
    trend: insight.trend,
    insight_text: insight.insightText,
  }));

  return {
    labels: reportData.map((d) => `${d.subject_name} (${d.room_name})`).slice(0, 10),
    averages: reportData.map((d) => d.average_score ?? 0).slice(0, 10),
    trends: reportData.map((d) => d.trend).slice(0, 10),
    insights: reportData,
  };
}

/**
 * Create a new user along with their role-specific relationships in a single
 * transaction. If any link fails (missing room, mismatched subject room, etc.)
 * the user is not created.
 *
 * Accepted shapes (validated upstream by createUserSchema):
 *   teacher: { assignments: { room_ids: [], subjects: [{ room_id, subject_id? | name? }] } }
 *   student: { assignments: { room_ids: [], parent_ids: [] } }
 *   parent : { assignments: { student_ids: [] } }
 *   admin  : no assignments
 */
async function createUser(userData) {
  const { name, email, password, role, assignments = {} } = userData;
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (role === 'teacher') {
      await applyTeacherAssignments(tx, user.id, assignments);
    } else if (role === 'student') {
      await applyStudentAssignments(tx, user.id, assignments);
    } else if (role === 'parent') {
      await applyParentAssignments(tx, user.id, assignments);
    }

    return user;
  });
}

async function applyTeacherAssignments(tx, teacherId, { room_ids = [], subjects = [] }) {
  // Every subject's room must be in the teacher's room set so the teacher
  // is actually allowed to teach that subject in that room.
  const teacherRoomIds = new Set(room_ids);
  for (const s of subjects) {
    if (!teacherRoomIds.has(s.room_id)) {
      throw new ValidationError(
        `Subject "${s.name || s.subject_id}" is in a room the teacher is not assigned to`,
      );
    }
  }

  if (teacherRoomIds.size > 0) {
    const rooms = await tx.room.findMany({
      where: { id: { in: [...teacherRoomIds] } },
      select: { id: true },
    });
    if (rooms.length !== teacherRoomIds.size) {
      throw new NotFoundError('One or more rooms do not exist');
    }
    await tx.teacherRoom.createMany({
      data: [...teacherRoomIds].map((roomId) => ({ teacherId, roomId })),
    });
  }

  for (const s of subjects) {
    if (s.subject_id) {
      const existing = await tx.subject.findFirst({
        where: { id: s.subject_id, roomId: s.room_id },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundError('Subject does not exist in the selected room');
      }
      await tx.subject.update({
        where: { id: s.subject_id },
        data: { teacherId },
      });
    } else {
      await tx.subject.create({
        data: { name: s.name, roomId: s.room_id, teacherId },
      });
    }
  }
}

async function applyStudentAssignments(tx, studentId, { room_ids = [], parent_ids = [] }) {
  if (room_ids.length > 0) {
    const rooms = await tx.room.findMany({
      where: { id: { in: room_ids } },
      select: { id: true },
    });
    if (rooms.length !== room_ids.length) {
      throw new NotFoundError('One or more rooms do not exist');
    }
    await tx.studentRoom.createMany({
      data: room_ids.map((roomId) => ({ studentId, roomId })),
    });
  }

  if (parent_ids.length > 0) {
    const parents = await tx.user.findMany({
      where: { id: { in: parent_ids }, role: 'parent' },
      select: { id: true },
    });
    if (parents.length !== parent_ids.length) {
      throw new NotFoundError('One or more parents do not exist');
    }
    await tx.parentStudent.createMany({
      data: parent_ids.map((parentId) => ({ parentId, studentId })),
    });
  }
}

async function applyParentAssignments(tx, parentId, { student_ids = [] }) {
  if (student_ids.length === 0) return;

  const students = await tx.user.findMany({
    where: { id: { in: student_ids }, role: 'student' },
    select: { id: true },
  });
  if (students.length !== student_ids.length) {
    throw new NotFoundError('One or more students do not exist');
  }
  await tx.parentStudent.createMany({
    data: student_ids.map((studentId) => ({ parentId, studentId })),
  });
}

/**
 * List all users in a school.
 */
async function listUsers() {
  return prisma.user.findMany({
    where: {},
    select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete a user if they belong to the specified school.
 */
async function deleteUser(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });
  if (!user) return null;

  await prisma.user.delete({ where: { id: userId } });
  return true;
}

/**
 * Create a room in a school.
 */
async function createRoom(roomData) {
  const { name, gradeLevel } = roomData;
  return prisma.room.create({
    data: { name, gradeLevel },
  });
}

/**
 * List all rooms in a school.
 */
async function listRooms() {
  return prisma.room.findMany({
    where: {},
    include: {
      _count: { select: { students: true, subjects: true } },
      teachers: { include: { teacher: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single room by ID if it belongs to the school.
 */
async function getRoom(roomId) {
  return prisma.room.findFirst({
    where: { id: roomId },
  });
}

/**
 * Enroll a student in a room if both belong to the school.
 */
async function enrollStudent(roomId, studentId) {
  const [cls, student] = await Promise.all([
    prisma.room.findFirst({ where: { id: roomId } }),
    prisma.user.findFirst({ where: { id: studentId, role: 'student' } }),
  ]);
  if (!cls || !student) return null;

  await prisma.studentRoom.upsert({
    where: { studentId_roomId: { studentId: studentId, roomId: roomId } },
    create: { studentId: studentId, roomId: roomId },
    update: {},
  });
  return true;
}

/**
 * List all students enrolled in a room.
 */
async function listRoomStudents(roomId) {
  const cls = await prisma.room.findFirst({
    where: { id: roomId },
  });
  if (!cls) return null;

  const students = await prisma.studentRoom.findMany({
    where: { roomId },
    include: { student: { select: { id: true, name: true, email: true } } },
  });
  return students.map((sc) => sc.student);
}

/**
 * Assign a teacher to a room if both belong to the school.
 */
async function assignTeacher(roomId, teacherId) {
  const [cls, teacher] = await Promise.all([
    prisma.room.findFirst({ where: { id: roomId } }),
    prisma.user.findFirst({ where: { id: teacherId, role: 'teacher' } }),
  ]);
  if (!cls || !teacher) return null;

  await prisma.teacherRoom.upsert({
    where: { teacherId_roomId: { teacherId: teacherId, roomId: roomId } },
    create: { teacherId: teacherId, roomId: roomId },
    update: {},
  });
  return true;
}

/**
 * Verify a teacher exists in the school AND is assigned to the room.
 * Returns the teacher record or null.
 */
async function verifyTeacherForRoom(teacherId, roomId) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: 'teacher' },
    select: { id: true },
  });
  if (!teacher) return null;

  const assignment = await prisma.teacherRoom.findFirst({
    where: { teacherId, roomId },
    select: { teacherId: true },
  });
  if (!assignment) return null;

  return teacher;
}

/**
 * List all subjects in a room with their assigned teacher.
 */
async function listRoomSubjects(roomId) {
  const cls = await prisma.room.findFirst({ where: { id: roomId }, select: { id: true } });
  if (!cls) return null;

  return prisma.subject.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      teacherId: true,
      createdAt: true,
      teacher: { select: { id: true, name: true, email: true } },
      _count: { select: { assignments: true } },
    },
  });
}

/**
 * Create a subject inside a room. Optionally assigns a teacher who must
 * already be assigned to the room.
 *
 * Returns:
 *   { ok: true, data: <subject> }
 *   { ok: false, code: 'CLASS_NOT_FOUND' | 'TEACHER_NOT_IN_CLASS' }
 */
async function createSubject(roomId, { name, teacherId }) {
  const cls = await prisma.room.findFirst({ where: { id: roomId }, select: { id: true } });
  if (!cls) return { ok: false, code: 'CLASS_NOT_FOUND' };

  if (teacherId) {
    const teacher = await verifyTeacherForRoom(teacherId, roomId);
    if (!teacher) return { ok: false, code: 'TEACHER_NOT_IN_CLASS' };
  }

  const subject = await prisma.subject.create({
    data: { roomId, name, teacherId: teacherId || null },
    select: {
      id: true,
      name: true,
      roomId: true,
      teacherId: true,
      teacher: { select: { id: true, name: true, email: true } },
    },
  });
  return { ok: true, data: subject };
}

/**
 * Update a subject's name and/or assigned teacher. Pass teacherId=null to unassign.
 *
 * Returns:
 *   { ok: true, data: <subject> }
 *   { ok: false, code: 'SUBJECT_NOT_FOUND' | 'TEACHER_NOT_IN_CLASS' }
 */
async function updateSubject(subjectId, { name, teacherId }) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId },
    select: { id: true, roomId: true },
  });
  if (!subject) return { ok: false, code: 'SUBJECT_NOT_FOUND' };

  // teacherId === undefined → not provided; null → explicit unassign; string → reassign
  if (teacherId !== undefined && teacherId !== null) {
    const teacher = await verifyTeacherForRoom(teacherId, subject.roomId);
    if (!teacher) return { ok: false, code: 'TEACHER_NOT_IN_CLASS' };
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (teacherId !== undefined) data.teacherId = teacherId; // null clears

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data,
    select: {
      id: true,
      name: true,
      roomId: true,
      teacherId: true,
      teacher: { select: { id: true, name: true, email: true } },
    },
  });
  return { ok: true, data: updated };
}

/**
 * Delete a subject (cascades to assignments, grades, etc. via Prisma cascade rules).
 */
async function deleteSubject(subjectId) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!subject) return null;

  await prisma.subject.delete({ where: { id: subjectId } });
  return true;
}

/**
 * Get the most recent analytics report for a school.
 */
async function getLatestAnalytics() {
  const report = await prisma.analyticsReport.findFirst({
    where: {},
    orderBy: { generatedAt: 'desc' },
  });

  if (!report) return null;

  return {
    id: report.id,
    generated_at: report.generatedAt,
    week_start: report.weekStart,
    report_type: report.reportType,
    school_summary: report.schoolSummary,
    at_risk_summary: report.atRiskSummary,
    recommended_actions: JSON.parse(report.recommendedActions || '[]'),
    subject_insights: JSON.parse(report.subjectInsightsJson || '[]'),
  };
}

/**
 * Link a parent to a student if both belong to the school.
 */
async function linkParentStudent(parentId, studentId) {
  const [parent, student] = await Promise.all([
    prisma.user.findFirst({ where: { id: parentId, role: 'parent' } }),
    prisma.user.findFirst({ where: { id: studentId, role: 'student' } }),
  ]);
  if (!parent || !student) return null;

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    create: { parentId, studentId },
    update: {},
  });
  return true;
}

module.exports = {
  getSchoolReport,
  getRiskOverview,
  getSubjectAnalytics,
  createUser,
  listUsers,
  deleteUser,
  createRoom,
  listRooms,
  getRoom,
  enrollStudent,
  listRoomStudents,
  assignTeacher,
  getLatestAnalytics,
  linkParentStudent,
  listRoomSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
