const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '0fe34931-eb9b-46a6-be38-16d604cde3a2';
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teacherPaths: true,
      markedAttendance: true,
      announcements: true,
      boardsCreated: true,
      threadsAuthored: true,
      repliesAuthored: true,
      teacherMeetings: true,
      parentMeetings: true,
      studentMeetings: true,
      timetableSlots: true,
      eventsCreated: true,
    }
  });
  
  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User data before delete:');
  console.log('teacherPaths:', user.teacherPaths.length);
  console.log('markedAttendance:', user.markedAttendance.length);
  console.log('announcements:', user.announcements.length);
  console.log('boardsCreated:', user.boardsCreated.length);
  console.log('threadsAuthored:', user.threadsAuthored.length);
  console.log('repliesAuthored:', user.repliesAuthored.length);
  console.log('teacherMeetings:', user.teacherMeetings.length);
  console.log('parentMeetings:', user.parentMeetings.length);
  console.log('studentMeetings:', user.studentMeetings.length);
  console.log('timetableSlots:', user.timetableSlots.length);
  console.log('eventsCreated:', user.eventsCreated.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
