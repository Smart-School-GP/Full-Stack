const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCurriculum() {
  const subjectsByGradeGroup = {
    primary: ['Mathematics', 'Science', 'English', 'Arabic', 'Social Studies', 'Arts', 'PE'],
    middle: ['Mathematics', 'Biology', 'Chemistry', 'Physics', 'English', 'Arabic', 'History', 'Geography', 'PE'],
    high: ['Calculus', 'Advanced Physics', 'Advanced Chemistry', 'World History', 'English Literature', 'Arabic Literature', 'Economics']
  };

  const curriculums = await prisma.curriculum.findMany();
  
  for (const curr of curriculums) {
    let subjectNames = [];
    if (curr.gradeLevel <= 6) {
      subjectNames = subjectsByGradeGroup.primary;
    } else if (curr.gradeLevel <= 9) {
      subjectNames = subjectsByGradeGroup.middle;
    } else {
      subjectNames = subjectsByGradeGroup.high;
    }

    console.log(`Seeding Grade ${curr.gradeLevel}...`);
    
    for (const name of subjectNames) {
      await prisma.curriculumSubject.create({
        data: {
          name,
          curriculumId: curr.id
        }
      });
    }
  }

  console.log('Done!');
  process.exit(0);
}

seedCurriculum().catch(err => {
  console.error(err);
  process.exit(1);
});
