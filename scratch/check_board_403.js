const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const boardId = '78a7b023-10b7-428d-a67a-c56a229ed731';
  const userId = '9aa88a12-fdc9-435d-a3cf-2877cf67594d';

  const board = await prisma.discussionBoard.findUnique({
    where: { id: boardId },
    include: {
      subject: true,
      room: true
    }
  });

  console.log('BOARD:', JSON.stringify(board, null, 2));

  const user = await prisma.user.findUnique({ where: { id: userId } });
  console.log('USER:', JSON.stringify(user, null, 2));

  if (board.roomId) {
    const tr = await prisma.teacherRoom.findUnique({
      where: { teacherId_roomId: { teacherId: userId, roomId: board.roomId } }
    });
    console.log('TEACHER_ROOM:', JSON.stringify(tr, null, 2));
  }

  if (board.subjectId) {
    const sub = await prisma.subject.findUnique({ where: { id: board.subjectId } });
    console.log('SUBJECT:', JSON.stringify(sub, null, 2));
  }

  process.exit(0);
}

check();
