const cron = require('node-cron');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { cronLogger } = require('../middleware/queryLogger');

/**
 * Sends notifications to relevant users 1 day before a school event.
 * Runs daily at 08:00 AM.
 */
function startEventReminderCronJob() {
  // 0 8 * * * = Daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    const cronCtx = cronLogger.start('event_reminders');
    logger.info('[EventReminderJob] Running daily event reminders');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find events starting tomorrow
      const events = await prisma.schoolEvent.findMany({
        where: {
          startDate: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
        },
      });

      for (const event of events) {
        // Find users to notify
        // If affectsRooms is null, notify everyone in the school
        // If it has room IDs, notify students and teachers of those rooms
        let recipientIds = [];

        if (!event.affectsRooms) {
          const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true },
          });
          recipientIds = users.map(u => u.id);
        } else {
          try {
            const roomIds = JSON.parse(event.affectsRooms);
            const students = await prisma.studentRoom.findMany({
              where: { roomId: { in: roomIds } },
              select: { studentId: true },
            });
            const teachers = await prisma.teacherRoom.findMany({
              where: { roomId: { in: roomIds } },
              select: { teacherId: true },
            });
            recipientIds = [
              ...new Set([
                ...students.map(s => s.studentId),
                ...teachers.map(t => t.teacherId)
              ])
            ];
          } catch (e) {
            logger.error('[EventReminderJob] Failed to parse affectsRooms', { eventId: event.id });
          }
        }

        // Bulk create notifications (Prisma doesn't have createMany for all DBs, so loop or use raw)
        // For simplicity in this platform, we'll loop or use a promise array
        await Promise.all(recipientIds.map(id => 
          prisma.notification.create({
            data: {
              recipientId: id,
              type: 'event_reminder',
              title: `Reminder: ${event.title} tomorrow!`,
              body: `Don't forget: ${event.title} starts tomorrow at ${event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            }
          }).catch(err => logger.error('[EventReminderJob] Notification failed', { userId: id, eventId: event.id, error: err.message }))
        ));
      }

      logger.info(`[EventReminderJob] Sent reminders for ${events.length} events`);
      cronLogger.success(cronCtx);
    } catch (err) {
      logger.error('[EventReminderJob] Critical error', { error: err.message });
      cronLogger.failure(cronCtx, err);
    }
  }, {
    timezone: "UTC"
  });

  logger.info('[EventReminderJob] Scheduled daily at 08:00 AM');
}

module.exports = { startEventReminderCronJob };
