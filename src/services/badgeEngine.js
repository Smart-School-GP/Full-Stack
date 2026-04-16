const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { awardXP } = require('./xpService');

/**
 * Checks whether a student qualifies for any active badges and awards them.
 * Called as a non-blocking side effect after grade, attendance, path, and discussion actions.
 *
 * @param {string} studentId
 * @param {string} schoolId
 * @param {string} triggerType - 'grade_average' | 'attendance_rate' | 'path_completion' | 'discussion_participation' | 'streak'
 */
async function checkAndAwardBadges(studentId, schoolId, triggerType) {
  try {
    const badges = await prisma.badgeDefinition.findMany({
      where: { schoolId, isActive: true, criteriaType: triggerType },
    });

    for (const badge of badges) {
      const alreadyEarned = await prisma.studentBadge.findUnique({
        where: { studentId_badgeId: { studentId, badgeId: badge.id } },
      });
      if (alreadyEarned) continue;

      let qualifies = false;

      switch (badge.criteriaType) {
        case 'grade_average': {
          const finals = await prisma.finalGrade.findMany({
            where: { studentId, finalScore: { not: null } },
          });
          if (finals.length > 0) {
            const avg = finals.reduce((s, g) => s + (g.finalScore || 0), 0) / finals.length;
            qualifies = avg >= (badge.criteriaValue || 0);
          }
          break;
        }

        case 'attendance_rate': {
          const records = await prisma.attendance.findMany({ where: { studentId } });
          if (records.length > 0) {
            const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
            const rate = (present / records.length) * 100;
            qualifies = rate >= (badge.criteriaValue || 0);
          }
          break;
        }

        case 'path_completion': {
          // Count paths where all required items are completed
          const paths = await prisma.learningPath.findMany({
            where: { schoolId, isPublished: true },
            include: {
              modules: {
                include: {
                  items: {
                    where: { isRequired: true },
                    include: {
                      progress: { where: { studentId } },
                    },
                  },
                },
              },
            },
          });
          let completedPaths = 0;
          for (const path of paths) {
            const allItems = path.modules.flatMap((m) => m.items);
            if (allItems.length === 0) continue;
            const allDone = allItems.every(
              (item) => item.progress[0]?.status === 'completed'
            );
            if (allDone) completedPaths++;
          }
          qualifies = completedPaths >= (badge.criteriaValue || 1);
          break;
        }

        case 'discussion_participation': {
          const threadCount = await prisma.discussionThread.count({ where: { authorId: studentId } });
          const replyCount = await prisma.discussionReply.count({ where: { authorId: studentId } });
          qualifies = (threadCount + replyCount) >= (badge.criteriaValue || 1);
          break;
        }

        case 'streak': {
          const xp = await prisma.studentXP.findUnique({ where: { studentId } });
          qualifies = (xp?.currentStreak || 0) >= (badge.criteriaValue || 1);
          break;
        }
      }

      if (qualifies) {
        await prisma.studentBadge.create({
          data: {
            studentId,
            badgeId: badge.id,
            note: 'Auto-awarded by system',
          },
        });

        // Award badge XP
        await awardXP(studentId, badge.pointsValue);

        // Notify student
        const user = await prisma.user.findUnique({
          where: { id: studentId },
          select: { schoolId: true },
        });
        if (user) {
          await prisma.notification.create({
            data: {
              schoolId: user.schoolId,
              recipientId: studentId,
              type: 'badge_earned',
              title: `You earned the "${badge.name}" badge! ${badge.iconEmoji || '🏆'}`,
              body: badge.description || `Badge awarded for ${badge.criteriaType}`,
            },
          });
        }
      }
    }
  } catch (err) {
    logger.error('[BadgeEngine] Error evaluating badges', { error: err.message, studentId });
  }
}

module.exports = { checkAndAwardBadges };
