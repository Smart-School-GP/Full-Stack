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

/**
 * Aggregated overview for a parent's dashboard:
 * today's attendance per child, upcoming homework/exams (next 14 days),
 * recent announcements, upcoming school events, high-risk subject alerts,
 * and total unread messages.
 *
 * Multi-tenant: all queries are scoped to schoolId, and only children whose
 * own schoolId matches are included.
 */
async function getParentOverview(parentId, schoolId) {
  const HORIZON_DAYS = 14;
  const MAX_UPCOMING = 10;
  const MAX_ANNOUNCEMENTS = 5;
  const MAX_EVENTS = 5;
  const MAX_RISK = 6;

  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    select: {
      student: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          studentClasses: {
            select: {
              classId: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  subjects: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const children = links
    .map((l) => l.student)
    .filter((s) => s && s.schoolId === schoolId);

  const empty = {
    children: [],
    todayAttendance: [],
    upcomingWork: [],
    announcements: [],
    events: [],
    riskAlerts: [],
    unreadMessages: 0,
  };

  if (children.length === 0) return empty;

  const childIds = children.map((c) => c.id);
  const subjectIds = [
    ...new Set(
      children.flatMap((c) =>
        c.studentClasses.flatMap((sc) => sc.class.subjects.map((s) => s.id))
      )
    ),
  ];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const horizon = new Date(startOfToday);
  horizon.setDate(horizon.getDate() + HORIZON_DAYS);
  const now = new Date();

  const [
    todayAttendanceRows,
    upcomingAssignments,
    announcements,
    events,
    riskAlerts,
    unreadMessages,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId: { in: childIds },
        date: { gte: startOfToday, lt: startOfTomorrow },
      },
      select: { studentId: true, status: true },
    }),
    subjectIds.length === 0
      ? []
      : prisma.assignment.findMany({
          where: {
            subjectId: { in: subjectIds },
            dueDate: { gte: now, lte: horizon },
          },
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
            maxScore: true,
            subjectId: true,
            subject: {
              select: {
                id: true,
                name: true,
                class: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          take: 50,
        }),
    prisma.announcement.findMany({
      where: {
        schoolId,
        audience: { in: ['all', 'parents'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        pinned: true,
        createdAt: true,
        creator: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: MAX_ANNOUNCEMENTS,
    }),
    prisma.schoolEvent.findMany({
      where: { schoolId, startDate: { gte: now, lte: horizon } },
      select: {
        id: true,
        title: true,
        eventType: true,
        startDate: true,
        endDate: true,
        color: true,
      },
      orderBy: { startDate: 'asc' },
      take: MAX_EVENTS,
    }),
    prisma.riskScore.findMany({
      where: {
        schoolId,
        studentId: { in: childIds },
        riskLevel: { in: ['high', 'critical'] },
      },
      select: {
        id: true,
        riskLevel: true,
        riskScore: true,
        trend: true,
        calculatedAt: true,
        subject: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
      orderBy: [{ riskLevel: 'desc' }, { riskScore: 'desc' }],
      take: MAX_RISK,
    }),
    prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: parentId },
        conversation: { parentId, schoolId },
      },
    }),
  ]);

  const assignmentIds = upcomingAssignments.map((a) => a.id);
  const submissions = assignmentIds.length === 0
    ? []
    : await prisma.submission.findMany({
        where: {
          assignmentId: { in: assignmentIds },
          studentId: { in: childIds },
        },
        select: { assignmentId: true, studentId: true, status: true },
      });

  const subjectToChildren = {};
  for (const c of children) {
    for (const sc of c.studentClasses) {
      for (const subj of sc.class.subjects) {
        if (!subjectToChildren[subj.id]) subjectToChildren[subj.id] = [];
        subjectToChildren[subj.id].push({ id: c.id, name: c.name });
      }
    }
  }

  const upcomingWork = upcomingAssignments
    .flatMap((a) => {
      const childrenForSubject = subjectToChildren[a.subjectId] || [];
      return childrenForSubject.map((child) => {
        const sub = submissions.find(
          (s) => s.assignmentId === a.id && s.studentId === child.id
        );
        return {
          id: `${a.id}:${child.id}`,
          assignmentId: a.id,
          title: a.title,
          type: a.type,
          dueDate: a.dueDate,
          subject: a.subject,
          class: a.subject.class,
          child,
          submitted: !!sub,
          submissionStatus: sub?.status ?? null,
        };
      });
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, MAX_UPCOMING);

  const todayAttendance = children.map((c) => {
    const records = todayAttendanceRows.filter((a) => a.studentId === c.id);
    let status = 'no-record';
    if (records.length > 0) {
      if (records.some((r) => r.status === 'absent')) status = 'absent';
      else if (records.some((r) => r.status === 'late')) status = 'late';
      else if (records.some((r) => r.status === 'excused')) status = 'excused';
      else status = 'present';
    }
    return {
      childId: c.id,
      childName: c.name,
      status,
      recordCount: records.length,
    };
  });

  return {
    children: children.map((c) => ({ id: c.id, name: c.name })),
    todayAttendance,
    upcomingWork,
    announcements,
    events,
    riskAlerts,
    unreadMessages,
  };
}

module.exports = {
  verifyParentStudent,
  getChildren,
  getChildGrades,
  getChildSubjectDetail,
  getChildHistory,
  getTeachersForChildren,
  getParentOverview,
};
