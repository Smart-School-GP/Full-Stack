const axios = require('axios');
const crypto = require('crypto');
const Sentry = require('@sentry/node');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8002';

// Salt used to anonymize student IDs before sending to the AI microservice.
// Override via AI_ANON_SALT env-var for consistent cross-restart hashing.
const ANON_SALT = process.env.AI_ANON_SALT || 'school-ai-salt-v1';

/**
 * Anonymize student IDs before sending to the AI service.
 * Returns { anonymizedFeatures, idMap: Map<hash -> realId> }
 */
function anonymizeFeatures(features) {
  const idMap = new Map();
  const anonymizedFeatures = features.map((f) => {
    const hash = crypto
      .createHmac('sha256', ANON_SALT)
      .update(f.student_id)
      .digest('hex')
      .slice(0, 32); // 32-char hex prefix is unique enough
    idMap.set(hash, f.student_id);
    return { ...f, student_id: hash };
  });
  return { anonymizedFeatures, idMap };
}

/**
 * Reverse-map anonymized student IDs back to real UUIDs.
 */
function deanonymizePredictions(predictions, idMap) {
  return predictions.map((p) => ({
    ...p,
    student_id: idMap.get(p.student_id) ?? p.student_id,
  }));
}

const FEATURE_LABELS = {
  current_final_score: 'Current final score',
  score_last_week: 'Score one week ago',
  score_two_weeks_ago: 'Score two weeks ago',
  score_change_7d: '7-day score change',
  score_change_14d: '14-day score change',
  assignments_submitted: 'Assignments submitted',
  assignments_total: 'Assignments assigned',
  submission_rate: 'Submission rate',
  days_since_last_grade: 'Days since last grade',
  room_average: 'Room average',
  score_vs_room_avg: 'Score vs. room average',
};

const TOP_N_FEATURES = 5;

/**
 * Rule-based decomposition that mirrors the Python fallback. Kept in sync
 * with ai-service/app/models/explainability._rule_contributions so the UI
 * looks identical regardless of which path produced the score.
 */
function ruleContributions(f) {
  const raw = [];
  const add = (feature, contribution) => {
    if (contribution === 0) return;
    raw.push({
      feature,
      label: FEATURE_LABELS[feature] ?? feature,
      value: Number((f[feature] ?? 0).toFixed(4)),
      contribution: Number(contribution.toFixed(4)),
    });
  };

  const cur = f.current_final_score ?? 100;
  if (cur < 50) add('current_final_score', 0.4);
  else if (cur < 65) add('current_final_score', 0.2);
  else add('current_final_score', -0.05);

  const c7 = f.score_change_7d ?? 0;
  if (c7 < -10) add('score_change_7d', 0.2);
  else if (c7 < -5) add('score_change_7d', 0.1);
  else if (c7 > 5) add('score_change_7d', -0.05);

  const c14 = f.score_change_14d ?? 0;
  if (c14 < -15) add('score_change_14d', 0.15);
  else if (c14 < -8) add('score_change_14d', 0.08);

  const sub = f.submission_rate ?? 1;
  if (sub < 0.5) add('submission_rate', 0.2);
  else if (sub < 0.75) add('submission_rate', 0.1);
  else if (sub >= 0.95) add('submission_rate', -0.05);

  const days = f.days_since_last_grade ?? 0;
  if (days > 21) add('days_since_last_grade', 0.1);
  else if (days > 14) add('days_since_last_grade', 0.05);

  const vs = f.score_vs_room_avg ?? 0;
  if (vs < -20) add('score_vs_room_avg', 0.1);
  else if (vs < -10) add('score_vs_room_avg', 0.05);
  else if (vs > 10) add('score_vs_room_avg', -0.05);

  raw.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const top = raw.slice(0, TOP_N_FEATURES);
  const total = top.reduce((acc, c) => acc + Math.abs(c.contribution), 0);
  return top.map((c) => ({
    ...c,
    normalized: total > 0 ? Number((c.contribution / total).toFixed(4)) : 0,
    direction: c.contribution > 0 ? 'risk' : 'protective',
  }));
}

/**
 * Build feature vectors for all student-subject pairs across all schools.
 *
 * PERF: Previously executed O(N) per-student Prisma queries (N+1 pattern).
 * Now fetches all required data in 3 queries total:
 *   1. All finalGrades with nested subject/assignments/roommates
 *   2. All grades for every relevant student batched in one query
 *   3. Nothing else — roommates' finalGrades are pulled via the subject include
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
      student: { select: { id: true } },
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

    // Room average — pulled from the single subject include above
    const roomScores = subject.finalGrades.map((sfg) => sfg.finalScore);
    const roomAverage =
      roomScores.length > 0
        ? roomScores.reduce((a, b) => a + b, 0) / roomScores.length
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
      room_average: roomAverage,
      score_vs_room_avg: currentScore - roomAverage,
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
 * Student IDs are anonymized (SHA-256 + HMAC salt) before transmission
 * and restored after the response to protect PII.
 * Falls back to rule-based scoring if the AI service is unavailable.
 */
async function getPredictions(features) {
  // ── Feature 5: Anonymize student IDs before sending to AI service ──────────
  const { anonymizedFeatures, idMap } = anonymizeFeatures(features);

  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/predict/risk`,
      { students: anonymizedFeatures },
      { timeout: 30000 }
    );
    return deanonymizePredictions(response.data.predictions, idMap);
  } catch (err) {
    logger.warn('[AIService] Prediction request failed — using rule-based fallback', {
      error: err.message,
    });
    if (process.env.SENTRY_DSN) Sentry.captureException(err);

    // Fallback: restore original student IDs from features directly
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
        feature_contributions: ruleContributions(f),
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
    predictions.map((pred) => {
      const explanations = pred.feature_contributions
        ? JSON.stringify(pred.feature_contributions)
        : null;
      return prisma.riskScore.upsert({
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
          explanations,
        },
        update: {
          riskScore: pred.risk_score,
          riskLevel: pred.risk_level,
          trend: pred.trend ?? 'stable',
          confidence: pred.confidence ?? null,
          explanations,
          calculatedAt: new Date(),
        },

      });
    })
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
      select: { id: true, name: true },
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
