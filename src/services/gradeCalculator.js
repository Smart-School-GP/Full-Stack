const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateFinalGrade(studentId, subjectId) {
  // 1. Fetch grading algorithm
  const algorithm = await prisma.gradingAlgorithm.findUnique({
    where: { subjectId },
  });

  if (!algorithm) {
    // No algorithm set — skip calculation
    return null;
  }

  const weights = algorithm.weights;

  // 2. Fetch all assignments for the subject
  const assignments = await prisma.assignment.findMany({
    where: { subjectId },
  });

  // 3. Fetch all grades for this student in this subject
  const grades = await prisma.grade.findMany({
    where: {
      studentId,
      assignmentId: { in: assignments.map((a) => a.id) },
    },
  });

  if (grades.length === 0) {
    await prisma.finalGrade.upsert({
      where: { studentId_subjectId: { studentId, subjectId } },
      create: { studentId, subjectId, finalScore: null },
      update: { finalScore: null },
    });
    return null;
  }

  // 4. Group grades by assignment type and calculate average per type
  const typeAverages = {};
  for (const type of Object.keys(weights)) {
    const typeAssignments = assignments.filter((a) => a.type === type);
    const typeAssignmentIds = new Set(typeAssignments.map((a) => a.id));
    const typeGrades = grades.filter((g) => typeAssignmentIds.has(g.assignmentId));

    if (typeGrades.length === 0) continue;

    const typeAssignmentMap = {};
    typeAssignments.forEach((a) => (typeAssignmentMap[a.id] = a));

    const avg =
      typeGrades.reduce((sum, g) => {
        const maxScore = typeAssignmentMap[g.assignmentId]?.maxScore || 100;
        return sum + (g.score / maxScore) * 100;
      }, 0) / typeGrades.length;

    typeAverages[type] = avg;
  }

  // 5. Apply weights to get final score
  let finalScore = 0;
  let totalWeight = 0;

  for (const [type, weight] of Object.entries(weights)) {
    if (typeAverages[type] !== undefined) {
      finalScore += typeAverages[type] * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > 0) {
    finalScore = finalScore / totalWeight;
  } else {
    finalScore = 0;
  }

  // 6. Upsert final grade
  const result = await prisma.finalGrade.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    create: { studentId, subjectId, finalScore },
    update: { finalScore },
  });

  return result;
}

module.exports = { recalculateFinalGrade };
