const prisma = require('../lib/prisma');

/**
 * Validates that the weights object sums to exactly 1.0.
 * Guards against floating-point drift with a tolerance of 1e-9.
 * @param {Record<string, number>} weights
 * @throws {Error} if sum deviates from 1.0
 */
function validateWeights(weights) {
  const sum = Object.values(weights).reduce((acc, w) => acc + Number(w), 0);
  if (Math.abs(sum - 1.0) > 1e-9) {
    throw new Error(
      `Weights must sum to exactly 1.0. Current sum: ${sum.toFixed(4)} — adjust your values and try again.`
    );
  }
}

/**
 * Maps a numeric grade (0–100) to a letter grade.
 * @param {number|null} score
 * @returns {string|null}
 */
function toLetterGrade(score) {
  if (score === null || score === undefined) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Safely parses the weights field which may be a JSON string or a plain object.
 * @param {string|object} w
 * @returns {Record<string, number>}
 */
function parseWeights(w) {
  if (!w) return {};
  if (typeof w === 'string') {
    try { return JSON.parse(w); } catch { return {}; }
  }
  return w;
}

/**
 * Recalculates and persists the final grade for a student in a subject.
 * Returns a rich result object including letter grade and per-category breakdown.
 *
 * @param {string} studentId
 * @param {string} subjectId
 * @returns {{ finalScore, letterGrade, breakdown } | null}
 */
async function recalculateFinalGrade(studentId, subjectId) {
  // 1. Fetch grading algorithm
  const algorithm = await prisma.gradingAlgorithm.findUnique({ where: { subjectId } });
  if (!algorithm) return null;

  const weights = parseWeights(algorithm.weights);

  // 2. Fetch all assignments for the subject
  const assignments = await prisma.assignment.findMany({ where: { subjectId } });

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

  // 4. Build a lookup map for assignments
  const assignmentMap = Object.fromEntries(assignments.map((a) => [a.id, a]));

  // 5. Compute per-category averages and accumulate weighted total
  const breakdown = {};
  let rawTotal = 0;
  let totalWeight = 0;

  for (const [type, weight] of Object.entries(weights)) {
    const typeAssignments = assignments.filter((a) => a.type === type);
    const typeGrades = grades.filter((g) => typeAssignments.some((a) => a.id === g.assignmentId));

    if (typeGrades.length === 0) continue;

    // Average as percentage of maxScore
    const avg =
      typeGrades.reduce((sum, g) => {
        const maxScore = assignmentMap[g.assignmentId]?.maxScore || 100;
        return sum + (g.score / maxScore) * 100;
      }, 0) / typeGrades.length;

    const rawContribution = avg * Number(weight);
    rawTotal += rawContribution;   // accumulate exact value — round only once at the end
    totalWeight += Number(weight);

    breakdown[type] = {
      average: parseFloat(avg.toFixed(2)),
      weight: Number(weight),
      contribution: parseFloat(rawContribution.toFixed(2)),
    };
  }

  // 6. Normalise by applied weight (handles partial categories gracefully)
  const finalScore = totalWeight > 0
    ? parseFloat((rawTotal / totalWeight).toFixed(2))
    : 0;

  const letterGrade = toLetterGrade(finalScore);

  // 7. Persist
  await prisma.finalGrade.upsert({
    where: { studentId_subjectId: { studentId, subjectId } },
    create: { studentId, subjectId, finalScore },
    update: { finalScore },
  });

  return { finalScore, letterGrade, breakdown };
}

module.exports = { recalculateFinalGrade, validateWeights, toLetterGrade, parseWeights };
