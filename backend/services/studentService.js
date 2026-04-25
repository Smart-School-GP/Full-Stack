const prisma = require('../lib/prisma');

/**
 * Get all final grades for a student across all subjects.
 */
async function getStudentGrades(studentId) {
  return prisma.finalGrade.findMany({
    where: { studentId },
    include: { subject: { include: { class: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Get detailed grades and assignments for a student in a specific subject.
 */
async function getStudentSubjectDetail(studentId, schoolId, subjectId) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, class: { schoolId } },
  });
  if (!subject) return null;

  const assignments = await prisma.assignment.findMany({
    where: { subjectId },
    orderBy: { createdAt: 'asc' },
  });

  const grades = await prisma.grade.findMany({
    where: {
      studentId,
      assignmentId: { in: assignments.map((a) => a.id) },
    },
  });

  const gradeMap = {};
  grades.forEach((g) => (gradeMap[g.assignmentId] = g.score));

  const finalGrade = await prisma.finalGrade.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
  });

  return {
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      score: gradeMap[a.id] ?? null,
      max_score: a.maxScore,
      date: a.createdAt,
    })),
    final_score: finalGrade?.finalScore ?? null,
  };
}

module.exports = {
  getStudentGrades,
  getStudentSubjectDetail,
};
