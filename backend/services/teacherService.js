const prisma = require('../lib/prisma');
const { recalculateFinalGrade } = require('./gradeCalculator');
const { checkAndAwardBadges } = require('./badgeEngine');

/**
 * Get all risk alerts for subjects taught by this teacher, enriched with
 * current grade and 7-day score change.
 *
 * Previously lived inline in the /risk-alerts route handler with an N+1
 * pattern (2 queries per riskScore row). Now batches all supplementary
 * lookups into 2 additional queries.
 */
async function getRiskAlertsForTeacher(teacherId) {
  const subjects = await prisma.subject.findMany({
    where: { teacherId },
    select: { id: true, name: true },
  });
  const subjectIds = subjects.map((s) => s.id);

  const riskScores = await prisma.riskScore.findMany({
    where: {
      subjectId: { in: subjectIds },
      riskLevel: { in: ['high', 'medium'] },
    },
    select: {
      studentId: true,
      subjectId: true,
      riskScore: true,
      riskLevel: true,
      trend: true,
      confidence: true,
      explanations: true,
      calculatedAt: true,
      student: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { riskScore: 'desc' },
  });

  if (riskScores.length === 0) return { alerts: [] };

  const pairIds = riskScores.map((rs) => ({
    studentId: rs.studentId,
    subjectId: rs.subjectId,
  }));

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Batch-fetch final grades and all relevant grades in 2 queries
  const [finalGrades, allGrades] = await Promise.all([
    prisma.finalGrade.findMany({
      where: {
        OR: pairIds.map((p) => ({ studentId: p.studentId, subjectId: p.subjectId })),
      },
      select: { studentId: true, subjectId: true, finalScore: true },
    }),
    prisma.grade.findMany({
      where: {
        studentId: { in: [...new Set(riskScores.map((rs) => rs.studentId))] },
        assignment: { subjectId: { in: subjectIds } },
      },
      select: {
        studentId: true,
        score: true,
        createdAt: true,
        assignment: { select: { subjectId: true, maxScore: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Build lookup maps
  const finalGradeMap = {};
  for (const fg of finalGrades) {
    finalGradeMap[`${fg.studentId}:${fg.subjectId}`] = fg.finalScore;
  }

  const gradeMap = {};
  for (const g of allGrades) {
    const key = `${g.studentId}:${g.assignment.subjectId}`;
    if (!gradeMap[key]) gradeMap[key] = [];
    gradeMap[key].push(g);
  }

  const calcAvg = (grades) => {
    if (!grades || grades.length === 0) return null;
    const total = grades.reduce(
      (sum, g) => sum + (g.score / g.assignment.maxScore) * 100,
      0
    );
    return total / grades.length;
  };

  const parseExplanations = (raw) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const alerts = riskScores.map((rs) => {
    const key = `${rs.studentId}:${rs.subjectId}`;
    const grades = gradeMap[key] || [];
    const recentGrades = grades.slice(0, 5);
    const oldGrades = grades.filter((g) => new Date(g.createdAt) <= oneWeekAgo);

    const recentAvg = calcAvg(recentGrades);
    const oldAvg = calcAvg(oldGrades);

    return {
      student_id: rs.studentId,
      student_name: rs.student.name,
      subject_id: rs.subjectId,
      subject_name: rs.subject.name,
      risk_score: rs.riskScore,
      risk_level: rs.riskLevel,
      trend: rs.trend ?? 'stable',
      confidence: rs.confidence ?? null,
      current_grade: finalGradeMap[key] ?? null,
      grade_change_7d:
        recentAvg !== null && oldAvg !== null ? recentAvg - oldAvg : null,
      explanations: parseExplanations(rs.explanations),
      calculated_at: rs.calculatedAt,
    };
  });

  return { alerts };
}

/**
 * Aggregate subject analytics (class average, distribution, below-passing list).
 * Previously inline in the /subjects/:subjectId/analytics route handler.
 */
async function getSubjectAnalytics(subjectId, teacherId) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, teacherId },
  });
  if (!subject) return null;

  const finalGrades = await prisma.finalGrade.findMany({
    where: { subjectId, finalScore: { not: null } },
    select: {
      finalScore: true,
      student: { select: { id: true, name: true } },
    },
  });

  const scores = finalGrades.map((fg) => fg.finalScore);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const highest = scores.length > 0 ? Math.max(...scores) : null;
  const lowest = scores.length > 0 ? Math.min(...scores) : null;
  const belowPassing = finalGrades.filter((fg) => fg.finalScore < 50);

  return {
    class_average: avg,
    highest_score: highest,
    lowest_score: lowest,
    students_below_passing: belowPassing.map((fg) => ({
      student: fg.student,
      score: fg.finalScore,
    })),
  };
}

/**
 * List all classes assigned to a teacher.
 */
async function listTeacherClasses(teacherId) {
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    include: {
      class: {
        include: {
          _count: {
            select: {
              students: true,
              subjects: { where: { teacherId } },
            },
          },
        },
      },
    },
  });
  return teacherClasses.map((tc) => tc.class);
}

/**
 * List students in a class if the teacher is assigned to it.
 */
async function listClassStudents(schoolId, teacherId, classId) {
  const [classInfo, assignment] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId } }),
    prisma.teacherClass.findFirst({ where: { teacherId, classId } }),
  ]);
  if (!classInfo || !assignment) return null;

  const students = await prisma.studentClass.findMany({
    where: { classId },
    include: { student: { select: { id: true, name: true, email: true } } },
  });
  return students.map((sc) => sc.student);
}

/**
 * List subjects taught by the teacher in a specific class.
 */
async function listClassSubjects(teacherId, classId) {
  return prisma.subject.findMany({
    where: { classId, teacherId },
    include: {
      gradingAlgorithm: true,
      _count: { select: { assignments: true } },
    },
  });
}

/**
 * Update or create grading weights for a subject.
 */
async function updateGradingAlgorithm(teacherId, subjectId, weights) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, teacherId },
  });
  if (!subject) return null;

  const weightsJson = JSON.stringify(weights);
  return prisma.gradingAlgorithm.upsert({
    where: { subjectId },
    create: { subjectId, weights: weightsJson },
    update: { weights: weightsJson },
  });
}

/**
 * Get full subject details including assignments and grades.
 */
async function getSubjectDetail(teacherId, subjectId) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, teacherId },
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
  if (!subject) return null;

  const [grades, finalGrades] = await Promise.all([
    prisma.grade.findMany({ where: { assignment: { subjectId } } }),
    prisma.finalGrade.findMany({ where: { subjectId } }),
  ]);

  return { ...subject, grades, finalGrades };
}

/**
 * Create a new assignment for a subject.
 */
async function createAssignment(teacherId, assignmentData) {
  const { subject_id, title, type, max_score, due_date, submission_type, instructions } = assignmentData;
  const subject = await prisma.subject.findFirst({
    where: { id: subject_id, teacherId },
  });
  if (!subject) return null;

  return prisma.assignment.create({
    data: {
      subjectId: subject_id,
      title,
      type,
      maxScore: max_score ?? 100,
      dueDate: due_date ? new Date(due_date) : null,
      submissionType: submission_type ?? 'both',
      instructions,
    },
  });
}

/**
 * Update an assignment.
 */
async function updateAssignment(teacherId, assignmentId, updateData) {
  const { due_date, submission_type, instructions, max_score, title } = updateData;
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, subject: { teacherId } },
  });
  if (!assignment) return null;

  return prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      title: title ?? assignment.title,
      maxScore: max_score !== undefined ? max_score : assignment.maxScore,
      dueDate: due_date !== undefined ? (due_date ? new Date(due_date) : null) : assignment.dueDate,
      submissionType: submission_type ?? assignment.submissionType,
      instructions: instructions !== undefined ? instructions : assignment.instructions,
    },
  });
}

/**
 * List assignments for a subject.
 */
async function listSubjectAssignments(teacherId, subjectId) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, teacherId },
  });
  if (!subject) return null;

  return prisma.assignment.findMany({
    where: { subjectId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Enter or update a grade for a student.
 */
async function enterGrade(teacherId, studentId, assignmentId, score) {
  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, subject: { teacherId } },
    include: { subject: true },
  });
  if (!assignment) return { error: 'NOT_FOUND' };
  if (score > assignment.maxScore) return { error: 'VALIDATION_ERROR', message: `Score must be between 0 and ${assignment.maxScore}` };

  const grade = await prisma.grade.upsert({
    where: { studentId_assignmentId: { studentId, assignmentId } },
    create: { studentId, assignmentId, score },
    update: { score },
  });

  await recalculateFinalGrade(studentId, assignment.subjectId);

  // Fire and forget badge check
  Promise.resolve().then(async () => {
    try {
      const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { schoolId: true } });
      if (teacher) await checkAndAwardBadges(studentId, teacher.schoolId, 'grade_average');
    } catch (err) {
      require('../lib/logger').error('[TeacherService] Background badge processing failed', { error: err.message });
    }
  });

  return { success: true, data: grade };
}

/**
 * Update an existing grade by ID.
 */
async function updateGrade(teacherId, gradeId, score) {
  const grade = await prisma.grade.findFirst({
    where: { id: gradeId },
    include: { assignment: { include: { subject: true } } },
  });
  if (!grade) return { error: 'NOT_FOUND' };
  if (grade.assignment.subject.teacherId !== teacherId) return { error: 'FORBIDDEN' };

  const updated = await prisma.grade.update({
    where: { id: gradeId },
    data: { score },
  });

  await recalculateFinalGrade(grade.studentId, grade.assignment.subjectId);

  // Fire and forget badge check
  Promise.resolve().then(async () => {
    try {
      const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { schoolId: true } });
      if (teacher) await checkAndAwardBadges(grade.studentId, teacher.schoolId, 'grade_average');
    } catch (err) {
      require('../lib/logger').error('[TeacherService] Background badge processing failed', { error: err.message });
    }
  });

  return { success: true, data: updated };
}

/**
 * List all unique parents of students in teacher's classes.
 */
async function listTeacherParents(teacherId) {
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    select: { classId: true },
  });
  const classIds = teacherClasses.map((tc) => tc.classId);

  const studentClasses = await prisma.studentClass.findMany({
    where: { classId: { in: classIds } },
    select: { studentId: true },
  });
  const studentIds = [...new Set(studentClasses.map((sc) => sc.studentId))];

  const parentStudents = await prisma.parentStudent.findMany({
    where: { studentId: { in: studentIds } },
    include: { parent: { select: { id: true, name: true, email: true } } },
  });

  const parentMap = {};
  parentStudents.forEach((ps) => {
    parentMap[ps.parentId] = ps.parent;
  });

  return Object.values(parentMap);
}

module.exports = {
  getRiskAlertsForTeacher,
  getSubjectAnalytics,
  listTeacherClasses,
  listClassStudents,
  listClassSubjects,
  updateGradingAlgorithm,
  getSubjectDetail,
  createAssignment,
  updateAssignment,
  listSubjectAssignments,
  enterGrade,
  updateGrade,
  listTeacherParents,
};
