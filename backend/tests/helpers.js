const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

async function createTestUser(role = 'student', schoolId = null) {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  if (!schoolId) {
    const school = await prisma.school.create({
      data: { name: 'Test School' }
    });
    schoolId = school.id;
  }

  const user = await prisma.user.create({
    data: {
      name: `Test ${role}`,
      email: `test-${role}-${Date.now()}@example.com`,
      passwordHash,
      role,
      schoolId
    }
  });

  return { user, schoolId };
}

async function cleanupDatabase() {
  // Order matters due to foreign keys
  await prisma.grade.deleteMany();
  await prisma.finalGrade.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
}

module.exports = {
  createTestUser,
  cleanupDatabase
};
