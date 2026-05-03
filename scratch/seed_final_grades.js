const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({ where: { role: 'student' } });
  const subjects = await prisma.subject.findMany();

  console.log(`Found ${students.length} students and ${subjects.length} subjects.`);

  for (const student of students) {
    for (const subject of subjects) {
      // 30% chance to have a final grade
      if (Math.random() > 0.3) {
        const score = Math.floor(Math.random() * 60) + 40; // 40-100
        let letter = 'F';
        if (score >= 90) letter = 'A';
        else if (score >= 80) letter = 'B';
        else if (score >= 70) letter = 'C';
        else if (score >= 60) letter = 'D';

        const breakdown = {
          exam: { average: score, weight: 0.6, contribution: score * 0.6 },
          homework: { average: score + 5 > 100 ? 100 : score + 5, weight: 0.4, contribution: (score + 5) * 0.4 }
        };

        await prisma.finalGrade.upsert({
          where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } },
          create: {
            studentId: student.id,
            subjectId: subject.id,
            finalScore: score,
            letterGrade: letter,
            breakdown: JSON.stringify(breakdown)
          },
          update: {
            finalScore: score,
            letterGrade: letter,
            breakdown: JSON.stringify(breakdown)
          }
        });
      }
    }
  }
  console.log('Finished seeding final grades.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
