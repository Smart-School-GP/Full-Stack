const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning database...');
  await prisma.grade.deleteMany();
  await prisma.finalGrade.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.gradingAlgorithm.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.class.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  console.log('🌱 Seeding database...');

  // Create school
  const school = await prisma.school.create({
    data: { name: 'Greenwood Academy', city: 'Istanbul', country: 'Turkey' },
  });
  console.log('✅ School created:', school.name);

  // Create admin
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: 'Admin User',
      email: 'admin@greenwood.edu',
      passwordHash: adminHash,
      role: 'admin',
    },
  });

  // Create owner
  const ownerHash = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.create({
    data: {
      schoolId: school.id, // Owner still needs a school_id due to schema constraint, but can manage all
      name: 'Platform Owner',
      email: 'owner@platform.com',
      passwordHash: ownerHash,
      role: 'owner',
    },
  });
  console.log('✅ Owner created:', owner.email);

  // Create teachers
  const teacherHash = await bcrypt.hash('teacher123', 10);
  const teacher1 = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: 'Dr. Sarah Johnson',
      email: 'sarah@greenwood.edu',
      passwordHash: teacherHash,
      role: 'teacher',
    },
  });
  const teacher2 = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: 'Prof. Ahmed Hassan',
      email: 'ahmed@greenwood.edu',
      passwordHash: teacherHash,
      role: 'teacher',
    },
  });

  // Create students
  const studentHash = await bcrypt.hash('student123', 10);
  const students = await Promise.all([
    prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'Alice Smith',
        email: 'alice@greenwood.edu',
        passwordHash: studentHash,
        role: 'student',
      },
    }),
    prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'Bob Martinez',
        email: 'bob@greenwood.edu',
        passwordHash: studentHash,
        role: 'student',
      },
    }),
    prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'Carol Chen',
        email: 'carol@greenwood.edu',
        passwordHash: studentHash,
        role: 'student',
      },
    }),
  ]);

  // Create parents
  const parentHash = await bcrypt.hash('parent123', 10);
  const parent = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: 'John Smith',
      email: 'john.smith@email.com',
      passwordHash: parentHash,
      role: 'parent',
    },
  });

  // Link parent to Alice
  await prisma.parentStudent.create({
    data: { parentId: parent.id, studentId: students[0].id },
  });

  // Create class
  const cls = await prisma.class.create({
    data: { schoolId: school.id, name: 'Class 10-A', gradeLevel: 10 },
  });

  // Enroll students
  for (const student of students) {
    await prisma.studentClass.create({
      data: { studentId: student.id, classId: cls.id },
    });
  }

  // Assign teachers
  await prisma.teacherClass.create({ data: { teacherId: teacher1.id, classId: cls.id } });
  await prisma.teacherClass.create({ data: { teacherId: teacher2.id, classId: cls.id } });

  // Create subjects
  const mathSubject = await prisma.subject.create({
    data: { classId: cls.id, teacherId: teacher1.id, name: 'Mathematics' },
  });
  const scienceSubject = await prisma.subject.create({
    data: { classId: cls.id, teacherId: teacher2.id, name: 'Science' },
  });

  // Create grading algorithms
  await prisma.gradingAlgorithm.create({
    data: {
      subjectId: mathSubject.id,
      weights: JSON.stringify({ exam: 0.5, homework: 0.3, project: 0.2 }),
    },
  });
  await prisma.gradingAlgorithm.create({
    data: {
      subjectId: scienceSubject.id,
      weights: JSON.stringify({ exam: 0.4, homework: 0.3, project: 0.3 }),
    },
  });

  // Create assignments for Math
  const mathAssignments = await Promise.all([
    prisma.assignment.create({
      data: { subjectId: mathSubject.id, title: 'Midterm Exam', type: 'exam', maxScore: 100 },
    }),
    prisma.assignment.create({
      data: { subjectId: mathSubject.id, title: 'HW: Algebra', type: 'homework', maxScore: 50 },
    }),
    prisma.assignment.create({
      data: { subjectId: mathSubject.id, title: 'Final Project', type: 'project', maxScore: 100 },
    }),
  ]);

  // Enter grades for Alice
  const gradeData = [
    { assignmentId: mathAssignments[0].id, score: 87 },
    { assignmentId: mathAssignments[1].id, score: 45 },
    { assignmentId: mathAssignments[2].id, score: 92 },
  ];

  for (const gd of gradeData) {
    await prisma.grade.create({
      data: { studentId: students[0].id, ...gd },
    });
  }

  // Recalculate final grade for Alice in Math
  const { recalculateFinalGrade } = require('../services/gradeCalculator');
  await recalculateFinalGrade(students[0].id, mathSubject.id);

  console.log('\n✅ Seed complete! Credentials:');
  console.log('Owner:   owner@platform.com / owner123');
  console.log('Admin:   admin@greenwood.edu / admin123');
  console.log('Teacher: sarah@greenwood.edu / teacher123');
  console.log('Teacher: ahmed@greenwood.edu / teacher123');
  console.log('Parent:  john.smith@email.com / parent123');
  console.log('Student: alice@greenwood.edu / student123');
  console.log('Student: bob@greenwood.edu / student123');
  console.log('Student: carol@greenwood.edu / student123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
