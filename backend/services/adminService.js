const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

/**
 * Compute school-wide performance report.
 * Previously lived inline in the /reports/school route handler.
 *
 * Returns class averages and a deduplicated list of at-risk students.
 */
async function getSchoolReport(schoolId) {
  const [totalStudents, classes, atRiskData] = await Promise.all([
    prisma.user.count({ where: { schoolId, role: 'student' } }),

    prisma.class.findMany({
      where: { schoolId },
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
        student: { schoolId },
      },
      select: {
        studentId: true,
        finalScore: true,
        student: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
  ]);

  const classAverages = classes.map((cls) => {
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
      class_id: cls.id,
      class_name: cls.name,
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
    class_averages: classAverages,
    at_risk_students: Object.values(atRiskMap),
  };
}

/**
 * Compute school-wide risk overview summary.
 * Previously lived inline in the /risk-overview route handler.
 */
async function getRiskOverview(schoolId) {
  const allRisk = await prisma.riskScore.findMany({
    where: { student: { schoolId } },
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
          studentClasses: {
            select: { class: { select: { id: true, name: true } } },
          },
        },
      },
      subject: { select: { name: true } },
    },
  });

  const high = allRisk.filter((r) => r.riskLevel === 'high');
  const medium = allRisk.filter((r) => r.riskLevel === 'medium');

  // Aggregate at-risk counts per class
  const classMap = {};
  for (const r of allRisk) {
    if (r.riskLevel === 'low') continue;
    for (const sc of r.student.studentClasses) {
      const cid = sc.class.id;
      if (!classMap[cid]) {
        classMap[cid] = { class_name: sc.class.name, at_risk_count: 0 };
      }
      classMap[cid].at_risk_count++;
    }
  }

  return {
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
  };
}

/**
 * Aggregate subject-level analytics for the analytics dashboard.
 * Previously lived inline in the /analytics/subjects route handler.
 */
async function getSubjectAnalytics(schoolId) {
  const insights = await prisma.subjectInsight.findMany({
    where: { schoolId },
    select: {
      subjectId: true,
      classId: true,
      averageScore: true,
      trend: true,
      insightText: true,
      subject: { select: { name: true } },
      class: { select: { name: true } },
    },
    orderBy: { generatedAt: 'desc' },
  });

  const reportData = insights.map((insight) => ({
    subject_id: insight.subjectId,
    class_id: insight.classId,
    subject_name: insight.subject.name,
    class_name: insight.class.name,
    average_score: insight.averageScore,
    trend: insight.trend,
    insight_text: insight.insightText,
  }));

  return {
    labels: reportData.map((d) => `${d.subject_name} (${d.class_name})`).slice(0, 10),
    averages: reportData.map((d) => d.average_score ?? 0).slice(0, 10),
    trends: reportData.map((d) => d.trend).slice(0, 10),
    insights: reportData,
  };
}

/**
 * Create a new user in the admin's school.
 */
async function createUser(schoolId, userData) {
  const { name, email, password, role } = userData;
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: { schoolId, name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, schoolId: true, createdAt: true },
  });
}

/**
 * List all users in a school.
 */
async function listUsers(schoolId) {
  return prisma.user.findMany({
    where: { schoolId },
    select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete a user if they belong to the specified school.
 */
async function deleteUser(schoolId, userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId },
  });
  if (!user) return null;

  await prisma.user.delete({ where: { id: userId } });
  return true;
}

/**
 * Create a class in a school.
 */
async function createClass(schoolId, classData) {
  const { name, gradeLevel } = classData;
  return prisma.class.create({
    data: { schoolId, name, gradeLevel },
  });
}

/**
 * List all classes in a school.
 */
async function listClasses(schoolId) {
  return prisma.class.findMany({
    where: { schoolId },
    include: {
      _count: { select: { students: true, subjects: true } },
      teachers: { include: { teacher: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single class by ID if it belongs to the school.
 */
async function getClass(schoolId, classId) {
  return prisma.class.findFirst({
    where: { id: classId, schoolId },
  });
}

/**
 * Enroll a student in a class if both belong to the school.
 */
async function enrollStudent(schoolId, classId, studentId) {
  const [cls, student] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId } }),
    prisma.user.findFirst({ where: { id: studentId, schoolId, role: 'student' } }),
  ]);
  if (!cls || !student) return null;

  await prisma.studentClass.upsert({
    where: { studentId_classId: { studentId: studentId, classId: classId } },
    create: { studentId: studentId, classId: classId },
    update: {},
  });
  return true;
}

/**
 * List all students enrolled in a class.
 */
async function listClassStudents(schoolId, classId) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
  });
  if (!cls) return null;

  const students = await prisma.studentClass.findMany({
    where: { classId },
    include: { student: { select: { id: true, name: true, email: true } } },
  });
  return students.map((sc) => sc.student);
}

/**
 * Assign a teacher to a class if both belong to the school.
 */
async function assignTeacher(schoolId, classId, teacherId) {
  const [cls, teacher] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId } }),
    prisma.user.findFirst({ where: { id: teacherId, schoolId, role: 'teacher' } }),
  ]);
  if (!cls || !teacher) return null;

  await prisma.teacherClass.upsert({
    where: { teacherId_classId: { teacherId: teacherId, classId: classId } },
    create: { teacherId: teacherId, classId: classId },
    update: {},
  });
  return true;
}

/**
 * Verify a teacher exists in the school AND is assigned to the class.
 * Returns the teacher record or null.
 */
async function verifyTeacherForClass(schoolId, teacherId, classId) {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, schoolId, role: 'teacher' },
    select: { id: true },
  });
  if (!teacher) return null;

  const assignment = await prisma.teacherClass.findFirst({
    where: { teacherId, classId },
    select: { teacherId: true },
  });
  if (!assignment) return null;

  return teacher;
}

/**
 * List all subjects in a class with their assigned teacher.
 */
async function listClassSubjects(schoolId, classId) {
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } });
  if (!cls) return null;

  return prisma.subject.findMany({
    where: { classId },
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
 * Create a subject inside a class. Optionally assigns a teacher who must
 * already be assigned to the class.
 *
 * Returns:
 *   { ok: true, data: <subject> }
 *   { ok: false, code: 'CLASS_NOT_FOUND' | 'TEACHER_NOT_IN_CLASS' }
 */
async function createSubject(schoolId, classId, { name, teacherId }) {
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } });
  if (!cls) return { ok: false, code: 'CLASS_NOT_FOUND' };

  if (teacherId) {
    const teacher = await verifyTeacherForClass(schoolId, teacherId, classId);
    if (!teacher) return { ok: false, code: 'TEACHER_NOT_IN_CLASS' };
  }

  const subject = await prisma.subject.create({
    data: { classId, name, teacherId: teacherId || null },
    select: {
      id: true,
      name: true,
      classId: true,
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
async function updateSubject(schoolId, subjectId, { name, teacherId }) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, class: { schoolId } },
    select: { id: true, classId: true },
  });
  if (!subject) return { ok: false, code: 'SUBJECT_NOT_FOUND' };

  // teacherId === undefined → not provided; null → explicit unassign; string → reassign
  if (teacherId !== undefined && teacherId !== null) {
    const teacher = await verifyTeacherForClass(schoolId, teacherId, subject.classId);
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
      classId: true,
      teacherId: true,
      teacher: { select: { id: true, name: true, email: true } },
    },
  });
  return { ok: true, data: updated };
}

/**
 * Delete a subject (cascades to assignments, grades, etc. via Prisma cascade rules).
 */
async function deleteSubject(schoolId, subjectId) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, class: { schoolId } },
    select: { id: true },
  });
  if (!subject) return null;

  await prisma.subject.delete({ where: { id: subjectId } });
  return true;
}

/**
 * Get the most recent analytics report for a school.
 */
async function getLatestAnalytics(schoolId) {
  const report = await prisma.analyticsReport.findFirst({
    where: { schoolId },
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
async function linkParentStudent(schoolId, parentId, studentId) {
  const [parent, student] = await Promise.all([
    prisma.user.findFirst({ where: { id: parentId, schoolId, role: 'parent' } }),
    prisma.user.findFirst({ where: { id: studentId, schoolId, role: 'student' } }),
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
  createClass,
  listClasses,
  getClass,
  enrollStudent,
  listClassStudents,
  assignTeacher,
  getLatestAnalytics,
  linkParentStudent,
  listClassSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
