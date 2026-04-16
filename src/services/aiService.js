const axios = require('axios');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8002';

/**
 * Build feature vectors for all student-subject pairs across all schools.
 *
 * PERF: Previously executed O(N) per-student Prisma queries (N+1 pattern).
 * Now fetches all required data in 3 queries total:
 *   1. All finalGrades with nested subject/assignments/classmates
 *   2. All grades for every relevant student batched in one query
 *   3. Nothing else — classmates' finalGrades are pulled via the subject include
 */
async function buildRiskFeatures() {
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  // ── Query 1: all finalGrades with subject metadata ──────────────────────────
  const finalGrades = await prisma.finalGrade.findMany({
    where: { finalScore: { not: null } },
    select: {
      studentId: true,
      subjectId: true,
      finalScore: true,
      subject: {
        select: {
          assignments: { select: { id: true } },
          finalGrades: {
            where: { finalScore: { not: null } },
            select: { finalScore: true },
          },
        },
      },
    },
  });

  if (finalGrades.length === 0) return [];

  // Collect all unique studentIds so we can batch-fetch grades
  const studentIds = [...new Set(finalGrades.map((fg) => fg.studentId))];
  const subjectIds = [...new Set(finalGrades.map((fg) => fg.subjectId))];

  // ── Query 2: all grades for these students across these subjects ─────────────
  const allGrades = await prisma.grade.findMany({
    where: {
      studentId: { in: studentIds },
      assignment: { subjectId: { in: subjectIds } },
    },
    select: {
      studentId: true,
      score: true,
      createdAt: true,
      assignment: { select: { subjectId: true, maxScore: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Build an O(1) lookup: gradesByStudentSubject[studentId][subjectId] = Grade[]
  const gradesByStudentSubject = {};
  for (const grade of allGrades) {
    const { studentId } = grade;
    const subjectId = grade.assignment.subjectId;
    if (!gradesByStudentSubject[studentId]) gradesByStudentSubject[studentId] = {};
    if (!gradesByStudentSubject[studentId][subjectId]) {
      gradesByStudentSubject[studentId][subjectId] = [];
    }
    gradesByStudentSubject[studentId][subjectId].push(grade);
  }

  // ── Build feature vectors in-memory (no DB calls inside the loop) ────────────
  const features = [];

  for (const fg of finalGrades) {
    const { studentId, subjectId, finalScore: currentScore, subject } = fg;

    const studentGrades =
      gradesByStudentSubject[studentId]?.[subjectId] ?? [];

    if (studentGrades.length === 0) continue;

    // studentGrades is already sorted desc by createdAt from the query
    const gradesLastWeek = studentGrades.filter(
      (g) => new Date(g.createdAt) <= oneWeekAgo
    );
    const gradesTwoWeeksAgo = studentGrades.filter(
      (g) => new Date(g.createdAt) <= twoWeeksAgo
    );

    const avgScore = (grades) => {
      if (!grades.length) return currentScore; // fallback to current
      const total = grades.reduce(
        (sum, g) => sum + (g.score / g.assignment.maxScore) * 100,
        0
      );
      return total / grades.length;
    };

    const scoreLastWeek = avgScore(gradesLastWeek);
    const scoreTwoWeeksAgo = avgScore(gradesTwoWeeksAgo);

    // Days since last grade
    const lastGradeDate = studentGrades[0]?.createdAt
      ? new Date(studentGrades[0].createdAt)
      : now;
    const daysSinceLast = Math.floor(
      (now - lastGradeDate) / (1000 * 60 * 60 * 24)
    );

    // Submission rate
    const assignmentsTotal = subject.assignments.length;
    const assignmentsSubmitted = studentGrades.length;
    const submissionRate =
      assignmentsTotal > 0 ? assignmentsSubmitted / assignmentsTotal : 0;

    // Class average — pulled from the single subject include above
    const classScores = subject.finalGrades.map((sfg) => sfg.finalScore);
    const classAverage =
      classScores.length > 0
        ? classScores.reduce((a, b) => a + b, 0) / classScores.length
        : currentScore;

    features.push({
      student_id: studentId,
      subject_id: subjectId,
      current_final_score: currentScore,
      score_last_week: scoreLastWeek,
      score_two_weeks_ago: scoreTwoWeeksAgo,
      score_change_7d: currentScore - scoreLastWeek,
      score_change_14d: currentScore - scoreTwoWeeksAgo,
      assignments_submitted: assignmentsSubmitted,
      assignments_total: assignmentsTotal,
      submission_rate: submissionRate,
      days_since_last_grade: daysSinceLast,
      class_average: classAverage,
      score_vs_class_avg: currentScore - classAverage,
    });
  }

  logger.info('[AIService] Built risk features', {
    studentCount: studentIds.length,
    subjectCount: subjectIds.length,
    featureCount: features.length,
  });

  return features;
}

/**
 * Send features to FastAPI and get back risk predictions.
 * Falls back to rule-based scoring if the AI service is unavailable.
 */
async function getPredictions(features) {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/predict/risk`,
      { students: features },
      { timeout: 30000 }
    );
    return response.data.predictions;
  } catch (err) {
    logger.warn('[AIService] Prediction request failed — using rule-based fallback', {
      error: err.message,
    });

    return features.map((f) => {
      let riskScore = 0;
      if (f.current_final_score < 50) riskScore += 0.4;
      else if (f.current_final_score < 65) riskScore += 0.2;
      if (f.score_change_7d < -5) riskScore += 0.15;
      if (f.score_change_14d < -10) riskScore += 0.15;
      if (f.submission_rate < 0.6) riskScore += 0.2;
      if (f.days_since_last_grade > 14) riskScore += 0.1;
      riskScore = Math.min(riskScore, 1.0);

      const riskLevel =
        riskScore >= 0.65 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low';
      const trend =
        f.score_change_7d > 2
          ? 'improving'
          : f.score_change_7d < -2
          ? 'declining'
          : 'stable';
      const confidence = parseFloat((Math.abs(riskScore - 0.5) * 2).toFixed(4));

      return {
        student_id: f.student_id,
        subject_id: f.subject_id,
        risk_score: parseFloat(riskScore.toFixed(3)),
        risk_level: riskLevel,
        trend,
        confidence,
      };
    });
  }
}

/**
 * Persist risk scores to the database using upsert.
 */
async function saveRiskScores(predictions) {
  // Batch upserts: Prisma doesn't support createMany+upsert in SQLite, so we
  // use Promise.allSettled to run them concurrently rather than sequentially.
  const results = await Promise.allSettled(
    predictions.map((pred) =>
      prisma.riskScore.upsert({
        where: {
          studentId_subjectId: {
            studentId: pred.student_id,
            subjectId: pred.subject_id,
          },
        },
        create: {
          studentId: pred.student_id,
          subjectId: pred.subject_id,
          riskScore: pred.risk_score,
          riskLevel: pred.risk_level,
          trend: pred.trend ?? 'stable',
          confidence: pred.confidence ?? null,
        },
        update: {
          riskScore: pred.risk_score,
          riskLevel: pred.risk_level,
          trend: pred.trend ?? 'stable',
          confidence: pred.confidence ?? null,
          calculatedAt: new Date(),
        },
      })
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    logger.error('[AIService] Some risk score upserts failed', {
      failedCount: failed.length,
      errors: failed.map((r) => r.reason?.message),
    });
  }
}

/**
 * Create in-app notifications for teachers when students cross the high-risk threshold.
 * Batches student and subject lookups to avoid N+1 queries.
 */
async function createRiskNotifications(predictions) {
  const highRisk = predictions.filter((p) => p.risk_level === 'high');
  if (highRisk.length === 0) return;

  const studentIds = [...new Set(highRisk.map((p) => p.student_id))];
  const subjectIds = [...new Set(highRisk.map((p) => p.subject_id))];

  // Batch fetch students and subjects
  const [students, subjects] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, schoolId: true },
    }),
    prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true, teacherId: true },
    }),
  ]);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

  const notificationsToCreate = highRisk
    .map((pred) => {
      const student = studentMap[pred.student_id];
      const subject = subjectMap[pred.subject_id];
      if (!student || !subject || !subject.teacherId) return null;

      return {
        schoolId: student.schoolId,
        recipientId: subject.teacherId,
        type: 'risk_alert',
        title: `High Risk: ${student.name}`,
        body: `${student.name} is at high risk of dropout in ${subject.name}. Risk score: ${(pred.risk_score * 100).toFixed(0)}%. Immediate attention recommended.`,
      };
    })
    .filter(Boolean);

  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({ data: notificationsToCreate });
    logger.info('[AIService] Created risk notifications', {
      count: notificationsToCreate.length,
    });
  }
}

module.exports = {
  buildRiskFeatures,
  getPredictions,
  saveRiskScores,
  createRiskNotifications,
};
