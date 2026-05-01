const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const room = await prisma.room.findFirst({
      include: {
        curriculum: {
          include: {
            subjects: true
          }
        }
      }
    });
    console.log('Success:', !!room);
    if (room) console.log('Curriculum:', !!room.curriculum);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
