const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const XP_REWARDS = {
  assignment_submitted:       10,
  assignment_graded_pass:     20,
  assignment_graded_excel:    40,
  path_item_completed:        15,
  path_completed:             50,
  discussion_post:            10,
  discussion_reply:            8,
  discussion_upvote_received:  5,
  attendance_present:          5,
  daily_login:                 3,
  portfolio_item_added:       12,
  badge_earned:                0, // badge.points_value is used instead
};

/**
 * Calculates level and progress from total XP.
 * Level 1: 0 XP, Level 2: 100 XP, Level 3: 220 XP, Level 4: 364 XP ...
 * Each level requires 20% more XP than previous.
 */
function calculateLevel(totalXP) {
  let level = 1;
  let required = 100;
  let accumulated = 0;
  while (totalXP >= accumulated + required) {
    accumulated += required;
    required = Math.floor(required * 1.2);
    level++;
  }
  const currentXP = totalXP - accumulated;
  return {
    level,
    currentXP,
    requiredXP: required,
    percentage: Math.round((currentXP / required) * 100),
  };
}

/**
 * Awards XP to a student, updates level, and sends level-up notification.
 * Non-blocking — safe to call with .then() / fire-and-forget.
 */
async function awardXP(studentId, amount) {
  if (!amount || amount <= 0) return;

  try {
    // Get or create XP record
    let xpRecord = await prisma.studentXP.findUnique({ where: { studentId } });
    if (!xpRecord) {
      xpRecord = await prisma.studentXP.create({
        data: { studentId, totalXP: 0, level: 1, currentStreak: 0, longestStreak: 0 },
      });
    }

    const newTotal = xpRecord.totalXP + amount;
    const oldLevel = xpRecord.level;
    const { level: newLevel } = calculateLevel(newTotal);

    await prisma.studentXP.update({
      where: { studentId },
      data: {
        totalXP: newTotal,
        level: newLevel,
        lastActivityDate: new Date(),
      },
    });

    // Level-up notification
    if (newLevel > oldLevel) {
      const user = await prisma.user.findUnique({
        where: { id: studentId },
        select: { schoolId: true },
      });
      if (user) {
        await prisma.notification.create({
          data: {
            schoolId: user.schoolId,
            recipientId: studentId,
            type: 'level_up',
            title: `Level up! You reached Level ${newLevel} 🎉`,
            body: `You now have ${newTotal} XP. Keep going to unlock more achievements!`,
          },
        });
      }
    }
  } catch (err) {
    logger.error('[XP] Failed to award XP', { error: err.message, studentId, amount });
  }
}

/**
 * Updates login streak and awards streak XP.
 */
async function updateLoginStreak(studentId) {
  try {
    let xpRecord = await prisma.studentXP.findUnique({ where: { studentId } });
    if (!xpRecord) {
      xpRecord = await prisma.studentXP.create({
        data: { studentId, totalXP: 0, level: 1, currentStreak: 0, longestStreak: 0 },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = xpRecord.lastActivityDate
      ? new Date(xpRecord.lastActivityDate)
      : null;

    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - lastActivity) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return; // Already logged in today
      if (diffDays === 1) {
        // Consecutive day
        const newStreak = xpRecord.currentStreak + 1;
        const newLongest = Math.max(newStreak, xpRecord.longestStreak);
        await prisma.studentXP.update({
          where: { studentId },
          data: { currentStreak: newStreak, longestStreak: newLongest },
        });

        // Milestone bonuses
        if (newStreak === 7) await awardXP(studentId, 25);
        else if (newStreak === 30) await awardXP(studentId, 100);
        else await awardXP(studentId, 3); // daily login
      } else {
        // Streak broken
        await prisma.studentXP.update({
          where: { studentId },
          data: { currentStreak: 1 },
        });
        await awardXP(studentId, 3);
      }
    } else {
      await prisma.studentXP.update({
        where: { studentId },
        data: { currentStreak: 1 },
      });
      await awardXP(studentId, 3);
    }
  } catch (err) {
    logger.error('[XP] Failed to update streak', { error: err.message, studentId });
  }
}

/**
 * Get XP data with level progress, earned badges, and recent XP history for a student.
 */
async function getStudentXPData(studentId) {
  const [xpRecord, earnedBadges, recentXP] = await Promise.all([
    prisma.studentXP.findUnique({ where: { studentId } }),
    prisma.studentBadge.findMany({
      where: { studentId },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    }),
    prisma.studentXP.findUnique({ where: { studentId }, select: { xpHistory: true } })
      .then((r) => {
        if (!r?.xpHistory) return [];
        try { return JSON.parse(r.xpHistory).slice(-20).reverse(); } catch { return []; }
      })
      .catch(() => []),
  ]);

  const base = xpRecord
    ? { ...xpRecord, ...calculateLevel(xpRecord.totalXP) }
    : { totalXP: 0, level: 1, currentXP: 0, requiredXP: 100, percentage: 0, currentStreak: 0, longestStreak: 0 };

  return {
    ...base,
    earnedBadges: earnedBadges.map((sb) => ({
      ...sb.badge,
      earnedAt: sb.awardedAt,
    })),
    recentXP,
  };
}

module.exports = { awardXP, updateLoginStreak, getStudentXPData, calculateLevel, XP_REWARDS };
