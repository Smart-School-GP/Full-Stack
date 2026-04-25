const prisma = require('../lib/prisma');

/**
 * Checks if a teacher is already assigned to another class at the same period/day.
 * Returns the conflicting slot or null.
 */
async function checkTeacherConflict(teacherId, periodId, dayOfWeek, effectiveFrom, excludeSlotId = null) {
  const where = {
    teacherId,
    periodId,
    dayOfWeek,
    effectiveFrom: { lte: new Date(effectiveFrom) },
    OR: [
      { effectiveUntil: null },
      { effectiveUntil: { gte: new Date(effectiveFrom) } },
    ],
  };
  if (excludeSlotId) where.id = { not: excludeSlotId };

  return prisma.timetableSlot.findFirst({
    where,
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
}

/**
 * Checks if a class already has a slot at the same period/day.
 */
async function checkClassConflict(classId, periodId, dayOfWeek, effectiveFrom, excludeSlotId = null) {
  const where = {
    classId,
    periodId,
    dayOfWeek,
    effectiveFrom: { lte: new Date(effectiveFrom) },
    OR: [
      { effectiveUntil: null },
      { effectiveUntil: { gte: new Date(effectiveFrom) } },
    ],
  };
  if (excludeSlotId) where.id = { not: excludeSlotId };

  return prisma.timetableSlot.findFirst({
    where,
    include: {
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });
}

/**
 * Builds a weekly timetable grid for a class.
 * Returns an array of slots grouped by day and period.
 */
async function buildClassTimetable(classId, schoolId) {
  const slots = await prisma.timetableSlot.findMany({
    where: {
      classId,
      schoolId,
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: new Date() } },
      ],
    },
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      period: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
  });
  return slots;
}

/**
 * Gets today's schedule for a class.
 */
async function getTodaySchedule(classId, schoolId) {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
  const slots = await prisma.timetableSlot.findMany({
    where: {
      classId,
      schoolId,
      dayOfWeek: today,
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: new Date() } },
      ],
    },
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      period: true,
    },
    orderBy: { period: { periodNumber: 'asc' } },
  });
  return slots;
}

module.exports = { checkTeacherConflict, checkClassConflict, buildClassTimetable, getTodaySchedule };
