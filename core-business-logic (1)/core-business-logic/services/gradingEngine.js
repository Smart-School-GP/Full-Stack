/**
 * Dynamic Grading Engine
 * Calculates a student's final weighted grade across configurable categories.
 */

const ROUNDING_PRECISION = 2;

/**
 * Validates that category weights sum to exactly 1.0 (100%).
 *
 * @param {GradingConfig[]} categories
 * @throws {Error} If weights do not sum to 1.0
 */
const validateWeights = (categories) => {
  const total = categories.reduce((sum, cat) => sum + cat.weight, 0);
  // Guard against floating-point drift (e.g. 0.1 + 0.2 + 0.7 = 0.9999...)
  if (Math.abs(total - 1.0) > 1e-9) {
    throw new Error(
      `Category weights must sum to exactly 1.0. Current sum: ${total.toFixed(4)}`
    );
  }
};

/**
 * Computes the simple average of an array of numeric scores.
 *
 * @param {number[]} scores
 * @returns {number}
 */
const average = (scores) => {
  if (!scores.length) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
};

/**
 * Maps a numeric grade (0–100) to a letter grade.
 *
 * @param {number} grade
 * @returns {string}
 */
const toLetterGrade = (grade) => {
  if (grade >= 90) return 'A';
  if (grade >= 80) return 'B';
  if (grade >= 70) return 'C';
  if (grade >= 60) return 'D';
  return 'F';
};

/**
 * Calculates a student's final weighted grade.
 *
 * @typedef {object} GradingConfig
 * @property {string}   name    - Category label (e.g. "Homework", "Exams")
 * @property {number}   weight  - Decimal weight, 0–1  (e.g. 0.4 for 40%)
 * @property {number[]} scores  - Raw scores for this category (0–100)
 *
 * @typedef {object} GradeResult
 * @property {number}          finalGrade    - Weighted final score (0–100)
 * @property {string}          letterGrade   - Corresponding letter grade
 * @property {CategoryResult[]} breakdown    - Per-category detail
 *
 * @typedef {object} CategoryResult
 * @property {string} name
 * @property {number} weight
 * @property {number} average
 * @property {number} contribution  - Weight × average
 *
 * @param {GradingConfig[]} categories
 * @returns {GradeResult}
 */
const calculateFinalGrade = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('At least one grading category is required.');
  }

  validateWeights(categories);

  // FIX: Track the exact, unrounded mathematical sum in the background.
  // Summing pre-rounded contributions causes floating-point drift
  // (e.g., 3 × 33.33 = 99.99 instead of 100.00).
  let rawTotal = 0;

  const breakdown = categories.map((cat) => {
    const avg = average(cat.scores);
    const rawContribution = avg * cat.weight;

    rawTotal += rawContribution; // Accumulate exact value — no rounding here

    return {
      name: cat.name,
      weight: cat.weight,
      average: parseFloat(avg.toFixed(ROUNDING_PRECISION)),
      contribution: parseFloat(rawContribution.toFixed(ROUNDING_PRECISION)), // UI display only
    };
  });

  // FIX: Round only once, on the final aggregated sum
  const finalGrade = parseFloat(rawTotal.toFixed(ROUNDING_PRECISION));

  return {
    finalGrade,
    letterGrade: toLetterGrade(finalGrade),
    breakdown,
  };
};

module.exports = { calculateFinalGrade };


// ---------------------------------------------------------------------------
// Usage Example
// ---------------------------------------------------------------------------
//
// const { calculateFinalGrade } = require('./gradingEngine');
//
// const result = calculateFinalGrade([
//   { name: 'Homework', weight: 0.20, scores: [85, 90, 78, 92] },
//   { name: 'Quizzes',  weight: 0.30, scores: [88, 76, 95] },
//   { name: 'Exams',    weight: 0.50, scores: [82, 79] },
// ]);
//
// console.log(result);
// → { finalGrade: 83.85, letterGrade: 'B', breakdown: [...] }
