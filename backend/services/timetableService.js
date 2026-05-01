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
      curriculumSubject: { select: { name: true } },
    },
  });
}

/**
 * Checks if a room already has a slot at the same period/day.
 */
async function checkRoomConflict(roomId, periodId, dayOfWeek, effectiveFrom, excludeSlotId = null) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  
  const where = {
    AND: [
      {
        OR: [
          { roomId },
          ...(room && room.gradeLevel ? [{ gradeLevel: room.gradeLevel }] : [])
        ]
      },
      { periodId },
      { dayOfWeek },
      { effectiveFrom: { lte: new Date(effectiveFrom) } },
      {
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: new Date(effectiveFrom) } },
        ]
      }
    ]
  };
  if (excludeSlotId) where.AND.push({ id: { not: excludeSlotId } });

  return prisma.timetableSlot.findFirst({
    where,
    include: {
      subject: { select: { name: true } },
      curriculumSubject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });
}

/**
 * Checks if a grade already has a slot or any of its rooms have a conflicting slot.
 */
async function checkGradeConflict(gradeLevel, periodId, dayOfWeek, effectiveFrom, excludeSlotId = null) {
  const rooms = await prisma.room.findMany({ where: { gradeLevel } });
  const roomIds = rooms.map(r => r.id);

  const where = {
    AND: [
      {
        OR: [
          { gradeLevel },
          ...(roomIds.length > 0 ? [{ roomId: { in: roomIds } }] : [])
        ]
      },
      { periodId },
      { dayOfWeek },
      { effectiveFrom: { lte: new Date(effectiveFrom) } },
      {
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: new Date(effectiveFrom) } },
        ]
      }
    ]
  };
  if (excludeSlotId) where.AND.push({ id: { not: excludeSlotId } });

  return prisma.timetableSlot.findFirst({
    where,
    include: {
      subject: { select: { name: true } },
      curriculumSubject: { select: { name: true } },
      room: { select: { name: true } },
    },
  });
}

/**
 * Builds a weekly timetable grid for a room.
 * Returns an array of slots grouped by day and period.
 */
async function buildRoomTimetable(roomId) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return [];

  const slots = await prisma.timetableSlot.findMany({
    where: {
      AND: [
        {
          OR: [
            { roomId },
            ...(room.gradeLevel ? [{ gradeLevel: room.gradeLevel }] : [])
          ]
        },
        {
          OR: [
            { effectiveUntil: null },
            { effectiveUntil: { gte: new Date() } },
          ]
        }
      ]
    },
    include: {
      subject: { select: { id: true, name: true } },
      curriculumSubject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      period: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
  });
  
  // Merge logic: If a grade slot and room slot exist for the same period/day, 
  // room slot takes precedence.
  const merged = [];
  const slotMap = new Map();
  
  for (const slot of slots) {
    const key = `${slot.dayOfWeek}-${slot.periodId}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, slot);
    } else {
      const existing = slotMap.get(key);
      if (!existing.roomId && slot.roomId) {
        slotMap.set(key, slot);
      }
    }
  }
  
  return Array.from(slotMap.values());
}

/**
 * Gets today's schedule for a room.
 */
async function getTodaySchedule(roomId) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return [];
  
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
  const slots = await prisma.timetableSlot.findMany({
    where: {
      AND: [
        {
          OR: [
            { roomId },
            ...(room.gradeLevel ? [{ gradeLevel: room.gradeLevel }] : [])
          ]
        },
        { dayOfWeek: today },
        {
          OR: [
            { effectiveUntil: null },
            { effectiveUntil: { gte: new Date() } },
          ]
        }
      ]
    },
    include: {
      subject: { select: { id: true, name: true } },
      curriculumSubject: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      period: true,
    },
    orderBy: { period: { periodNumber: 'asc' } },
  });
  
  const merged = [];
  const slotMap = new Map();
  
  for (const slot of slots) {
    const key = `${slot.dayOfWeek}-${slot.periodId}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, slot);
    } else {
      const existing = slotMap.get(key);
      if (!existing.roomId && slot.roomId) {
        slotMap.set(key, slot);
      }
    }
  }
  
  return Array.from(slotMap.values());
}

module.exports = { checkTeacherConflict, checkRoomConflict, checkGradeConflict, buildRoomTimetable, getTodaySchedule };
