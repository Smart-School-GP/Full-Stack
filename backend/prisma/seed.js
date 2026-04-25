
const bcrypt = require('bcryptjs');

const prisma = require("../lib/prisma");

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🧹 Cleaning database...');
  await prisma.grade.deleteMany();
  await prisma.finalGrade.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.gradingAlgorithm.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.class.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.analyticsJob.deleteMany();
  await prisma.analyticsReport.deleteMany();
  await prisma.subjectInsight.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  console.log('🌱 Seeding database...');

  const school = await prisma.school.create({
    data: { name: 'Greenwood International School', city: 'Istanbul', country: 'Turkey' },
  });
  console.log('✅ School created:', school.name);

  const adminHash = await bcrypt.hash('admin123', 10);
  const admins = await Promise.all([
    prisma.user.create({ data: { schoolId: school.id, name: 'Ahmed Hassan', email: 'ahmed@greenwood.edu', passwordHash: adminHash, role: 'admin' } }),
    prisma.user.create({ data: { schoolId: school.id, name: 'Sarah Miller', email: 'sarah@greenwood.edu', passwordHash: adminHash, role: 'admin' } }),
  ]);
  console.log('✅ 2 Administrators created');

  const teacherHash = await bcrypt.hash('teacher123', 10);
  const teachers = await Promise.all([
    prisma.user.create({ data: { schoolId: school.id, name: 'Dr. John Smith', email: 'john.smith@greenwood.edu', passwordHash: teacherHash, role: 'teacher' } }),
    prisma.user.create({ data: { schoolId: school.id, name: 'Ms. Emily Davis', email: 'emily.davis@greenwood.edu', passwordHash: teacherHash, role: 'teacher' } }),
    prisma.user.create({ data: { schoolId: school.id, name: 'Mr. Michael Brown', email: 'michael.brown@greenwood.edu', passwordHash: teacherHash, role: 'teacher' } }),
    prisma.user.create({ data: { schoolId: school.id, name: 'Mrs. Lisa Anderson', email: 'lisa.anderson@greenwood.edu', passwordHash: teacherHash, role: 'teacher' } }),
    prisma.user.create({ data: { schoolId: school.id, name: 'Mr. David Wilson', email: 'david.wilson@greenwood.edu', passwordHash: teacherHash, role: 'teacher' } }),
  ]);
  console.log('✅ 5 Teachers created');

  const studentHash = await bcrypt.hash('student123', 10);
  const studentNames = [
    'Alice Johnson', 'Bob Williams', 'Carol Davis', 'Daniel Miller', 'Emma Garcia',
    'Frank Martinez', 'Grace Lee', 'Henry Taylor', 'Isabella Moore', 'Jack White',
    'Karen Harris', 'Leo Martin', 'Mia Thompson', 'Noah Garcia', 'Olivia Robinson',
    'Peter Clark', 'Quinn Lewis', 'Rachel Walker', 'Sam Hall', 'Tina Allen',
    'Uma Young', 'Victor King', 'Wendy Wright', 'Xavier Scott', 'Yara Green',
    'Zack Baker', 'Amy Adams', 'Ben Nelson', 'Chloe Carter', 'Dan Mitchell'
  ];
  
  const students = await Promise.all(
    studentNames.map(name => 
      prisma.user.create({ data: { schoolId: school.id, name, email: `${name.toLowerCase().replace(' ', '.')}@greenwood.edu`, passwordHash: studentHash, role: 'student' } })
    )
  );
  console.log('✅ 30 Students created');

  const parentHash = await bcrypt.hash('parent123', 10);
  const parentNames = [
    'Robert Johnson', 'Patricia Williams', 'Michael Davis', 'Jennifer Miller', 'William Garcia',
    'Elizabeth Martinez', 'David Lee', 'Barbara Taylor', 'Richard Moore', 'Susan White',
    'Joseph Harris', 'Maria Martin', 'Thomas Thompson', 'Linda Garcia', 'Charles Robinson',
    'Nancy Lewis', 'Christopher Walker', 'Betty Hall', 'Matthew Allen', 'Sandra Young'
  ];
  
  const parents = await Promise.all(
    parentNames.map(name => 
      prisma.user.create({ data: { schoolId: school.id, name, email: `${name.toLowerCase().replace(' ', '.')}@email.com`, passwordHash: parentHash, role: 'parent' } })
    )
  );
  console.log('✅ 20 Parents created');

  for (let i = 0; i < 20; i++) {
    await prisma.parentStudent.create({
      data: { parentId: parents[i].id, studentId: students[i].id }
    });
  }
  for (let i = 0; i < 10; i++) {
    await prisma.parentStudent.create({
      data: { parentId: parents[i % 20].id, studentId: students[20 + i].id }
    });
  }
  console.log('✅ Parent-Student relationships created');

  const classes = await Promise.all([
    prisma.class.create({ data: { schoolId: school.id, name: 'Class 9-A', gradeLevel: 9 } }),
    prisma.class.create({ data: { schoolId: school.id, name: 'Class 9-B', gradeLevel: 9 } }),
    prisma.class.create({ data: { schoolId: school.id, name: 'Class 10-A', gradeLevel: 10 } }),
    prisma.class.create({ data: { schoolId: school.id, name: 'Class 10-B', gradeLevel: 10 } }),
    prisma.class.create({ data: { schoolId: school.id, name: 'Class 11-A', gradeLevel: 11 } }),
    prisma.class.create({ data: { schoolId: school.id, name: 'Class 11-B', gradeLevel: 11 } }),
  ]);
  console.log('✅ 6 Classes created');

  const classStudentMap = {
    'Class 9-A': students.slice(0, 5),
    'Class 9-B': students.slice(5, 10),
    'Class 10-A': students.slice(10, 15),
    'Class 10-B': students.slice(15, 20),
    'Class 11-A': students.slice(20, 25),
    'Class 11-B': students.slice(25, 30),
  };

  for (const cls of classes) {
    for (const student of classStudentMap[cls.name]) {
      await prisma.studentClass.create({ data: { studentId: student.id, classId: cls.id } });
    }
  }

  const teacherClassMap = {
    'Class 9-A': [teachers[0], teachers[1]],
    'Class 9-B': [teachers[0], teachers[2]],
    'Class 10-A': [teachers[1], teachers[3]],
    'Class 10-B': [teachers[2], teachers[3]],
    'Class 11-A': [teachers[3], teachers[4]],
    'Class 11-B': [teachers[4], teachers[1]],
  };

  for (const cls of classes) {
    for (const teacher of teacherClassMap[cls.name]) {
      await prisma.teacherClass.create({ data: { teacherId: teacher.id, classId: cls.id } });
    }
  }

  const subjectData = [
    { classId: classes[0].id, teacherId: teachers[0].id, name: 'Mathematics' },
    { classId: classes[0].id, teacherId: teachers[1].id, name: 'Science' },
    { classId: classes[0].id, teacherId: teachers[2].id, name: 'English' },
    { classId: classes[1].id, teacherId: teachers[0].id, name: 'Mathematics' },
    { classId: classes[1].id, teacherId: teachers[2].id, name: 'Science' },
    { classId: classes[1].id, teacherId: teachers[3].id, name: 'English' },
    { classId: classes[2].id, teacherId: teachers[1].id, name: 'Mathematics' },
    { classId: classes[2].id, teacherId: teachers[3].id, name: 'Science' },
    { classId: classes[2].id, teacherId: teachers[4].id, name: 'English' },
    { classId: classes[3].id, teacherId: teachers[2].id, name: 'Mathematics' },
    { classId: classes[3].id, teacherId: teachers[3].id, name: 'Science' },
    { classId: classes[3].id, teacherId: teachers[4].id, name: 'English' },
    { classId: classes[4].id, teacherId: teachers[3].id, name: 'Mathematics' },
    { classId: classes[4].id, teacherId: teachers[4].id, name: 'Physics' },
    { classId: classes[5].id, teacherId: teachers[4].id, name: 'Mathematics' },
    { classId: classes[5].id, teacherId: teachers[1].id, name: 'Physics' },
  ];

  const subjects = await Promise.all(
    subjectData.map(data => prisma.subject.create({ data }))
  );
  console.log('✅ 16 Subjects created');

  const gradingWeights = [
    { exam: 0.5, homework: 0.3, project: 0.2 },
    { exam: 0.4, homework: 0.3, project: 0.3 },
    { exam: 0.4, homework: 0.4, participation: 0.2 },
    { exam: 0.35, homework: 0.35, project: 0.15, quiz: 0.15 },
  ];

  for (let i = 0; i < subjects.length; i++) {
    await prisma.gradingAlgorithm.create({
      data: { subjectId: subjects[i].id, weights: JSON.stringify(gradingWeights[i % gradingWeights.length]) }
    });
  }
  console.log('✅ Grading algorithms created');

  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const assignmentTypes = [
    { type: 'homework', maxScore: 50, count: 1 },
    { type: 'quiz', maxScore: 30, count: 1 },
    { type: 'exam', maxScore: 100, count: 1 },
  ];

  const studentProfiles = [];
  const profileTypes = ['high_performer', 'average', 'declining', 'at_risk', 'struggling', 'inconsistent', 'recovering'];
  const profileScores = [90, 75, 70, 42, 52, 68, 65];

  for (let i = 0; i < students.length; i++) {
    const profileIndex = i % 7;
    studentProfiles.push({
      student: students[i],
      type: profileTypes[profileIndex],
      baseScore: profileScores[profileIndex] + randomInt(-5, 5),
      decline: profileTypes[profileIndex] === 'declining',
    });
  }

  console.log('📚 Creating assignments and grades for 1 month...');

  for (const subject of subjects) {
    const assignments = [];
    for (const at of assignmentTypes) {
      for (let i = 0; i < at.count; i++) {
        const dueDate = randomDate(oneMonthAgo, now);
        const assignment = await prisma.assignment.create({
          data: {
            subjectId: subject.id,
            title: `${at.type.charAt(0).toUpperCase() + at.type.slice(1)} ${i + 1}`,
            type: at.type,
            maxScore: at.maxScore,
            dueDate,
            instructions: `Complete the ${at.type} assignment.`,
          },
        });
        assignments.push({ ...assignment, type: at.type, maxScore: at.maxScore });
      }
    }

    for (const profile of studentProfiles) {
      const gradeData = [];
      let currentScore = profile.baseScore;

      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        let score;

        if (profile.decline) {
          score = Math.max(15, currentScore - (Math.random() * 12) - ((i % 4) * 3));
        } else if (profile.type === 'inconsistent') {
          score = currentScore + (Math.random() * 35 - 17);
          score = Math.max(25, Math.min(100, score));
        } else if (profile.type === 'recovering') {
          score = currentScore + (i * 2.5) + (Math.random() * 8 - 4);
          score = Math.min(100, score);
        } else if (profile.type === 'at_risk' || profile.type === 'struggling') {
          score = currentScore + (Math.random() * 15 - 7);
          score = Math.max(20, Math.min(65, score));
        } else if (profile.type === 'high_performer') {
          score = currentScore + (Math.random() * 8 - 4);
          score = Math.max(75, Math.min(100, score));
        } else {
          score = currentScore + (Math.random() * 12 - 6);
          score = Math.max(50, Math.min(95, score));
        }

        const createdAt = randomDate(oneMonthAgo, now);
        await prisma.grade.create({
          data: {
            studentId: profile.student.id,
            assignmentId: assignment.id,
            score: (score / 100) * assignment.maxScore,
            createdAt,
          },
        });
        gradeData.push({ maxScore: assignment.maxScore, score: (score / 100) * assignment.maxScore });
      }

      const totalScore = gradeData.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / gradeData.length;
      await prisma.finalGrade.upsert({
        where: { studentId_subjectId: { studentId: profile.student.id, subjectId: subject.id } },
        create: { studentId: profile.student.id, subjectId: subject.id, finalScore: totalScore },
        update: { finalScore: totalScore },
      });
    }
  }
  console.log('✅ Grades and assignments created');

  console.log('📅 Creating attendance records for 1 month...');
  for (const student of students) {
    const classId = student.id === students[0].id ? classes[0].id : 
                   student.id === students[5].id ? classes[1].id :
                   student.id === students[10].id ? classes[2].id :
                   student.id === students[15].id ? classes[3].id :
                   student.id === students[20].id ? classes[4].id : classes[5].id;

    for (let d = 0; d < 30; d++) {
      const date = new Date(oneMonthAgo);
      date.setDate(date.getDate() + d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const rand = Math.random();
      let status = 'present';
      if (rand > 0.95) status = 'absent';
      else if (rand > 0.88) status = 'late';

      await prisma.attendance.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          classId,
          date,
          status,
          markedBy: teachers[0].id,
        },
      });
    }
  }
  console.log('✅ Attendance records created (1 month)');

  console.log('⚠️ Creating risk scores...');
  const riskStudents = [
    { studentIdx: 3, subjectIdx: 0, score: 0.88, level: 'high' },
    { studentIdx: 3, subjectIdx: 1, score: 0.75, level: 'high' },
    { studentIdx: 9, subjectIdx: 4, score: 0.82, level: 'high' },
    { studentIdx: 14, subjectIdx: 6, score: 0.78, level: 'high' },
    { studentIdx: 19, subjectIdx: 9, score: 0.71, level: 'high' },
    { studentIdx: 24, subjectIdx: 12, score: 0.69, level: 'medium' },
    { studentIdx: 2, subjectIdx: 0, score: 0.58, level: 'medium' },
    { studentIdx: 7, subjectIdx: 3, score: 0.52, level: 'medium' },
    { studentIdx: 12, subjectIdx: 6, score: 0.48, level: 'medium' },
    { studentIdx: 17, subjectIdx: 8, score: 0.55, level: 'medium' },
    { studentIdx: 22, subjectIdx: 11, score: 0.45, level: 'medium' },
    { studentIdx: 27, subjectIdx: 14, score: 0.42, level: 'medium' },
    { studentIdx: 5, subjectIdx: 1, score: 0.35, level: 'low' },
    { studentIdx: 10, subjectIdx: 6, score: 0.28, level: 'low' },
    { studentIdx: 15, subjectIdx: 8, score: 0.22, level: 'low' },
    { studentIdx: 20, subjectIdx: 12, score: 0.18, level: 'low' },
    { studentIdx: 25, subjectIdx: 14, score: 0.12, level: 'low' },
    { studentIdx: 0, subjectIdx: 0, score: 0.05, level: 'low' },
    { studentIdx: 6, subjectIdx: 2, score: 0.08, level: 'low' },
    { studentIdx: 11, subjectIdx: 7, score: 0.10, level: 'low' },
  ];

  for (const r of riskStudents) {
    await prisma.riskScore.create({
      data: {
        schoolId: school.id,
        studentId: students[r.studentIdx].id,
        subjectId: subjects[r.subjectIdx].id,
        riskScore: r.score,
        riskLevel: r.level,
      },
    });
  }
  console.log('✅ Risk scores created');

  console.log('📊 Creating analytics reports...');
  const weekStarts = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(oneMonthAgo);
    weekStart.setDate(weekStart.getDate() + (w * 7));
    weekStarts.push(weekStart.toISOString().split('T')[0]);
  }

  for (const weekStart of weekStarts) {
    await prisma.analyticsReport.create({
      data: {
        schoolId: school.id,
        reportType: 'weekly',
        schoolSummary: `Weekly summary for week starting ${weekStart}. Overall school performance is stable.`,
        atRiskSummary: `3 students identified as high risk this week. Recommended immediate intervention.`,
        recommendedActions: JSON.stringify([
          'Schedule parent-teacher meetings for high-risk students',
          'Review homework submission policies',
          'Provide additional support for struggling students'
        ]),
        subjectInsightsJson: JSON.stringify([
          { subject_id: subjects[0].id, insight_text: 'Math class 9-A showing 8% improvement', average_score: 78, trend: 'up' },
          { subject_id: subjects[4].id, insight_text: 'Science class 9-B needs attention', average_score: 62, trend: 'down' },
        ]),
        weekStart,
      },
    });
  }
  console.log('✅ Analytics reports created');

  console.log('📝 Creating subject insights...');
  for (const subject of subjects.slice(0, 8)) {
    await prisma.subjectInsight.create({
      data: {
        schoolId: school.id,
        subjectId: subject.id,
        classId: subject.classId,
        insightText: `${subject.name} class showing ${randomInt(-10, 15)}% change from last month. Average score: ${randomInt(55, 88)}%.`,
        averageScore: randomInt(55, 88),
        trend: ['up', 'down', 'stable'][randomInt(0, 2)],
      },
    });
  }
  console.log('✅ Subject insights created');

  console.log('\n✅ Seed complete!\n');
  console.log('📋 Credentials:');
  console.log('Admin:    ahmed@greenwood.edu / admin123');
  console.log('Admin:    sarah@greenwood.edu / admin123');
  console.log('Teachers: teacher123 (5 teachers)');
  console.log('Parents:  parent123 (20 parents)');
  console.log('Students: student123 (30 students)');
  console.log('\n📊 Test Data Summary:');
  console.log('- 2 Administrators');
  console.log('- 5 Teachers');
  console.log('- 30 Students');
  console.log('- 20 Parents');
  console.log('- 6 Classes (9-A, 9-B, 10-A, 10-B, 11-A, 11-B)');
  console.log('- 16 Subjects');
  console.log('- 3 assignments per subject (~48 total)');
  console.log('- 3 grades per student per subject');
  console.log('- 1 month of attendance records (~24 days per student)');
  console.log('- Pre-populated risk scores (high, medium, low)');
  console.log('- 4 weekly analytics reports');
  console.log('- Subject insights for AI testing');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
