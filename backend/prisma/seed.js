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
  const tables = [
    'payment', 'timetableSlot', 'timetablePeriod', 'studentSentiment', 'schoolEvent',
    'studentXP', 'portfolioItem', 'studentBadge', 'badgeDefinition', 'replyUpvote',
    'discussionReply', 'discussionThread', 'discussionBoard', 'pathProgress',
    'pathItem', 'pathModule', 'learningPath', 'curriculumSubject', 'deviceToken',
    'announcementRecipient', 'announcementRead', 'announcement', 'submission',
    'message', 'conversation', 'attendance', 'analyticsJob', 'subjectInsight',
    'analyticsReport', 'meeting', 'notification', 'riskScore', 'parentStudent',
    'finalGrade', 'grade', 'assignment', 'gradingAlgorithm', 'subject',
    'teacherRoom', 'studentRoom', 'room', 'curriculum', 'user', 'school'
  ];

  for (const table of tables) {
    try {
      await prisma[table].deleteMany();
    } catch (e) {
      console.warn(`Could not clean table ${table}: ${e.message}`);
    }
  }

  console.log('🌱 Seeding database (Scaled Edition)...');

  // 1. School
  const school = await prisma.school.create({
    data: { name: 'Al-Theora International School', city: 'Amman', country: 'Jordan' },
  });

  // 2. Users Generation
  const adminHash = await bcrypt.hash('admin123', 10);
  const teacherHash = await bcrypt.hash('teacher123', 10);
  const studentHash = await bcrypt.hash('student123', 10);
  const parentHash = await bcrypt.hash('parent123', 10);

  console.log('👥 Creating users...');
  const admins = await Promise.all([
    prisma.user.create({ data: { name: 'Admin One', email: 'admin1@altheora.edu', passwordHash: adminHash, role: 'admin' } }),
    prisma.user.create({ data: { name: 'Admin Two', email: 'admin2@altheora.edu', passwordHash: adminHash, role: 'admin' } }),
  ]);

  const teachers = await Promise.all([...Array(7)].map((_, i) => 
    prisma.user.create({ 
      data: { 
        name: `Teacher ${i + 1}`, 
        email: `teacher${i + 1}@altheora.edu`, 
        passwordHash: teacherHash, 
        role: 'teacher' 
      } 
    })
  ));

  const parents = await Promise.all([...Array(15)].map((_, i) => 
    prisma.user.create({ 
      data: { 
        name: `Parent ${i + 1}`, 
        email: `parent${i + 1}@email.com`, 
        passwordHash: parentHash, 
        role: 'parent' 
      } 
    })
  ));

  const students = await Promise.all([...Array(56)].map((_, i) => 
    prisma.user.create({ 
      data: { 
        name: `Student ${i + 1}`, 
        email: `student${i + 1}@altheora.edu`, 
        passwordHash: studentHash, 
        role: 'student',
        gradeLevel: 7 + Math.floor(i / 10) // Grades 7-12
      } 
    })
  ));

  // Link parents to students (approx 3.7 students per parent)
  for (let i = 0; i < students.length; i++) {
    const parent = parents[i % parents.length];
    await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: students[i].id } });
    await prisma.studentXP.create({ data: { studentId: students[i].id, totalXP: randomInt(100, 1000), level: randomInt(1, 10) } });
  }

  // 3. Infrastructure (Curriculums & Rooms)
  console.log('🏫 Creating infrastructure (14 rooms)...');
  const gradeLevels = [7, 8, 9, 10, 11, 12];
  const curriculums = await Promise.all(gradeLevels.map(gl => 
    prisma.curriculum.create({
      data: { 
        gradeLevel: gl, 
        name: `Grade ${gl} Curriculum`,
        subjects: {
          create: [
            { name: 'Mathematics' },
            { name: 'Science' },
            { name: 'English' },
            { name: 'History' }
          ]
        }
      },
      include: { subjects: true }
    })
  ));

  const roomSuffixes = ['A', 'B', 'C'];
  let rooms = [];
  let roomIndex = 0;
  for (const gl of gradeLevels) {
    const count = (gl === 9 || gl === 10) ? 3 : 2; // Extra rooms for grade 9 and 10 to reach 14
    for (let i = 0; i < count; i++) {
      const r = await prisma.room.create({
        data: { name: `Room ${gl}-${roomSuffixes[i]}`, gradeLevel: gl, location: `Building ${gl % 2 === 0 ? 'X' : 'Y'}`, capacity: 25 }
      });
      rooms.push(r);
    }
  }

  // Assign students to rooms (approx 4 per room)
  for (let i = 0; i < students.length; i++) {
    const r = rooms[i % rooms.length];
    await prisma.studentRoom.create({ data: { studentId: students[i].id, roomId: r.id } });
  }

  // 4. Academic Framework (Subjects & Timetable)
  console.log('📅 Creating subjects and timetables...');
  const periods = await Promise.all([...Array(6)].map((_, i) => 
    prisma.timetablePeriod.create({
      data: { 
        name: `Period ${i + 1}`, 
        startTime: `${8 + i}:00`, 
        endTime: `${8 + i}:50`, 
        periodNumber: i + 1 
      }
    })
  ));

  for (const r of rooms) {
    const curriculum = curriculums.find(c => c.gradeLevel === r.gradeLevel);
    const roomSubjects = await Promise.all(curriculum.subjects.map((cs, idx) => 
      prisma.subject.create({
        data: {
          name: cs.name,
          roomId: r.id,
          teacherId: teachers[idx % teachers.length].id,
          gradingAlgorithm: {
            create: { weights: JSON.stringify({ exam: 0.4, homework: 0.3, quiz: 0.3 }) }
          }
        }
      })
    ));

    // Create 5-day timetable for this room
    for (let day = 1; day <= 5; day++) {
      for (let pIdx = 0; pIdx < periods.length; pIdx++) {
        const subject = roomSubjects[pIdx % roomSubjects.length];
        await prisma.timetableSlot.create({
          data: {
            roomId: r.id,
            subjectId: subject.id,
            teacherId: subject.teacherId,
            periodId: periods[pIdx].id,
            dayOfWeek: day,
            effectiveFrom: new Date()
          }
        });
      }
    }
  }

  // 5. History (2 Weeks of Attendance & Grades)
  console.log('📊 Generating 2 weeks of history...');
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const allSubjects = await prisma.subject.findMany({ include: { room: true } });

  for (const r of rooms) {
    const roomStudents = students.filter((_, i) => i % rooms.length === rooms.indexOf(r));
    const roomSubjects = allSubjects.filter(s => s.roomId === r.id);

    for (let d = 0; d < 14; d++) {
      const date = new Date(twoWeeksAgo);
      date.setDate(date.getDate() + d);
      if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

      for (const student of roomStudents) {
        // Attendance
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            roomId: r.id,
            date,
            status: Math.random() > 0.1 ? 'present' : 'absent',
            markedBy: roomSubjects[0].teacherId
          }
        });
      }
    }

    // Grades (2 assignments per subject per room over 2 weeks)
    for (const subject of roomSubjects) {
      for (let w = 0; w < 2; w++) {
        const assignment = await prisma.assignment.create({
          data: {
            subjectId: subject.id,
            title: `Week ${w + 1} Assessment`,
            type: w === 0 ? 'homework' : 'quiz',
            maxScore: 100,
            dueDate: new Date(twoWeeksAgo.getTime() + (w * 7 + 4) * 86400000)
          }
        });

        for (const student of roomStudents) {
          const score = randomInt(50, 100);
          await prisma.grade.create({
            data: { studentId: student.id, assignmentId: assignment.id, score }
          });
          await prisma.submission.create({
            data: { assignmentId: assignment.id, studentId: student.id, status: 'graded', score }
          });
        }
      }
    }
  }

  // 6. Other Data Tables
  console.log('✨ Populating remaining tables...');
  
  // Announcements
  const ann = await prisma.announcement.create({
    data: { createdBy: admins[0].id, title: 'School Reopening', body: 'Welcome to Al-Theora!', audience: 'all' }
  });
  await Promise.all(students.slice(0, 10).map(s => prisma.announcementRecipient.create({ data: { announcementId: ann.id, userId: s.id } })));

  // Discussions
  const board = await prisma.discussionBoard.create({
    data: { title: 'Main Forum', createdBy: teachers[0].id, type: 'general', roomId: rooms[0].id }
  });
  const thread = await prisma.discussionThread.create({
    data: { boardId: board.id, authorId: students[0].id, title: 'Hello World', body: 'This is a test thread.' }
  });
  await prisma.discussionReply.create({
    data: { threadId: thread.id, authorId: teachers[1].id, body: 'Welcome!' }
  });

  // Learning Paths
  const lp = await prisma.learningPath.create({
    data: { 
      teacherId: teachers[0].id, 
      subjectId: allSubjects[0].id, 
      title: 'Path to Success', 
      isPublished: true,
      modules: {
        create: {
          title: 'Module 1',
          orderIndex: 0,
          items: {
            create: { title: 'First Resource', type: 'reading', orderIndex: 0 }
          }
        }
      }
    }
  });

  // Payments
  for (const p of parents) {
    await prisma.payment.create({
      data: { parentId: p.id, amount: 200, status: 'PAID', description: 'Monthly Fee', paidAt: new Date() }
    });
  }

  // Events
  await prisma.schoolEvent.create({
    data: { title: 'Open House', eventType: 'social', startDate: new Date(), endDate: new Date(), createdBy: admins[0].id }
  });

  // Badges
  const badge = await prisma.badgeDefinition.create({
    data: { name: 'Star Student', description: 'Awarded for excellence', iconEmoji: '⭐', pointsValue: 50 }
  });
  await prisma.studentBadge.create({ data: { studentId: students[0].id, badgeId: badge.id, awardedBy: teachers[0].id } });

  console.log('\n✅ Scaled Seeding complete!\n');
  console.log(`📊 Stats: 2 Admins, 7 Teachers, 15 Parents, 56 Students, 14 Rooms, 6 Curriculums.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
