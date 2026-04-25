const prisma = require('../lib/prisma');

/**
 * Checks if a teacher is already assigned to another room at the same period/day.
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
      room: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
}

/**
 * Checks if a room already has a slot at the same period/day.
 */
async function checkRoomConflict(roomId, periodId, dayOfWeek, effectiveFrom, excludeSlotId = null) {
  const where = {
    roomId,
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
 * Builds a weekly timetable grid for a room.
 * Returns an array of slots grouped by day and period.
 */
async function buildRoomTimetable(roomId) {
  const slots = await prisma.timetableSlot.findMany({
    where: {
      roomId,
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
 * Gets today's schedule for a room.
 */
async function getTodaySchedule(roomId) {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
  const slots = await prisma.timetableSlot.findMany({
    where: {
      roomId,
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

module.exports = { checkTeacherConflict, checkRoomConflict, buildRoomTimetable, getTodaySchedule };
