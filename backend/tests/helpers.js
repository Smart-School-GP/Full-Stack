const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

const TEST_PASSWORD_ROUNDS = 10;

async function createTestUser(role = 'student') {
  const passwordHash = await bcrypt.hash('password123', TEST_PASSWORD_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: `Test ${role}`,
      email: `test-${role}-${Date.now()}@example.com`,
      passwordHash,
      role,
    },
  });

  return { user };
}

async function cleanupDatabase() {
  // Order matters due to foreign keys.
  await prisma.grade.deleteMany();
  await prisma.finalGrade.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
}

module.exports = {
  createTestUser,
  cleanupDatabase,
};
