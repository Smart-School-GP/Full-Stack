const prisma = require('../lib/prisma');

/**
 * Verify if a parent is authorized to view a student's data.
 */
async function verifyParentStudent(parentId, studentId, schoolId) {
  const rel = await prisma.parentStudent.findFirst({
    where: { parentId, studentId },
    include: { student: true },
  });
  if (!rel || rel.student.schoolId !== schoolId) return null;
  return rel;
}

/**
 * List all children linked to a parent, with their basic info and classes.
 */
async function getChildren(parentId) {
  const relations = await prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        include: {
          finalGrades: { include: { subject: true } },
          studentClasses: { include: { class: true } },
        },
      },
    },
  });
  return relations.map((r) => r.student);
}

/**
 * Get summary of grades for a child.
 */
async function getChildGrades(studentId) {
  const finalGrades = await prisma.finalGrade.findMany({
    where: { studentId },
    include: { subject: true },
    orderBy: { updatedAt: 'desc' },
  });

  return {
    subjects: finalGrades.map((fg) => ({
      subject_id: fg.subjectId,
      name: fg.subject.name,
      final_score: fg.finalScore,
      last_updated: fg.updatedAt,
    })),
  };
}

/**
 * Get detailed grades and assignments for a child in a specific subject.
 */
async function getChildSubjectDetail(studentId, subjectId) {
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

/**
 * Get historical grade trends for a child.
 */
async function getChildHistory(studentId) {
  const history = await prisma.finalGrade.findMany({
    where: { studentId },
    include: { subject: true },
    orderBy: { updatedAt: 'asc' },
  });

  return {
    history: history.map((fg) => ({
      subject: fg.subject.name,
      score: fg.finalScore,
      date: fg.updatedAt,
    })),
  };
}

module.exports = {
  verifyParentStudent,
  getChildren,
  getChildGrades,
  getChildSubjectDetail,
  getChildHistory,
};
