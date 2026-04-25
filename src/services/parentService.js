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

/**
 * Return the list of teachers who teach any of a parent's children,
 * grouped per (teacher, child) pair so the UI can show a separate
 * "message about Jack" / "message about Emma" card when a teacher
 * teaches multiple children of the same parent.
 *
 * Subjects taught by that teacher to the child are listed for context.
 */
async function getTeachersForChildren(parentId, schoolId) {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    select: {
      studentId: true,
      student: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          studentClasses: {
            select: {
              class: {
                select: {
                  id: true,
                  name: true,
                  subjects: {
                    where: { teacherId: { not: null } },
                    select: {
                      id: true,
                      name: true,
                      teacherId: true,
                      teacher: { select: { id: true, name: true, email: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const map = new Map();

  for (const link of links) {
    const child = link.student;
    if (!child || child.schoolId !== schoolId) continue;

    for (const sc of child.studentClasses) {
      for (const subject of sc.class.subjects) {
        if (!subject.teacherId || !subject.teacher) continue;

        const key = `${subject.teacherId}:${child.id}`;
        if (!map.has(key)) {
          map.set(key, {
            teacher_id: subject.teacherId,
            teacher_name: subject.teacher.name,
            teacher_email: subject.teacher.email,
            child_id: child.id,
            child_name: child.name,
            classes: new Map(),
          });
        }

        const entry = map.get(key);
        if (!entry.classes.has(sc.class.id)) {
          entry.classes.set(sc.class.id, { id: sc.class.id, name: sc.class.name, subjects: [] });
        }
        entry.classes.get(sc.class.id).subjects.push({ id: subject.id, name: subject.name });
      }
    }
  }

  return [...map.values()].map((e) => ({
    ...e,
    classes: [...e.classes.values()],
  }));
}

module.exports = {
  verifyParentStudent,
  getChildren,
  getChildGrades,
  getChildSubjectDetail,
  getChildHistory,
  getTeachersForChildren,
};
