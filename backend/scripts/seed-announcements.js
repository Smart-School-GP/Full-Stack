const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  
  if (!school || !admin) {
    console.error('School or Admin not found');
    return;
  }

  console.log('Seeding announcements...');

  // 1. Curriculum Announcement
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      createdBy: admin.id,
      title: '2026 Academic Curriculum',
      body: 'Welcome to the new academic year! Here is the overview of the curriculum for all grades. We will focus on advanced stem and digital literacy this year.',
      audience: 'all',
      category: 'curriculum',
      pinned: true,
    }
  });

  // 2. General Announcement
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      createdBy: admin.id,
      title: 'Spring Festival Next Week',
      body: 'Don\'t miss our annual Spring Festival! There will be games, food, and student performances.',
      audience: 'all',
      category: 'general',
      pinned: false,
    }
  });

  // 3. Urgent Announcement
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      createdBy: admin.id,
      title: 'Maintenance Update: Portal Access',
      body: 'The student portal will be down for maintenance this Sunday from 2 AM to 4 AM UTC.',
      audience: 'students',
      category: 'urgent',
      pinned: true,
    }
  });

  console.log('Done seeding announcements!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
