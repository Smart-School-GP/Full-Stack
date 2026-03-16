const axios = require('axios');


const prisma = require("../lib/prisma");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Build feature vectors for all student-subject pairs across all schools.
 * Returns an array of feature objects ready to send to FastAPI.
 */
async function buildRiskFeatures() {
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  // Get all final grades with related data
  const finalGrades = await prisma.finalGrade.findMany({
    include: {
      student: { select: { id: true, schoolId: true } },
      subject: {
        include: {
          assignments: true,
          finalGrades: true, // for class average
        },
      },
    },
  });

  const features = [];

  for (const fg of finalGrades) {
    if (fg.finalScore === null) continue;

    const { studentId, subjectId, subject } = fg;

    // Get this student's grades for this subject
    const studentGrades = await prisma.grade.findMany({
      where: {
        studentId,
        assignment: { subjectId },
      },
      include: { assignment: true },
      orderBy: { createdAt: 'desc' },
    });

    if (studentGrades.length === 0) continue;

    // Estimate score snapshots from grade timestamps
    const gradesLastWeek = studentGrades.filter(
      (g) => new Date(g.createdAt) <= oneWeekAgo
    );
    const gradesTwoWeeksAgo = studentGrades.filter(
      (g) => new Date(g.createdAt) <= twoWeeksAgo
    );

    const avgScore = (grades) => {
      if (!grades.length) return fg.finalScore; // fallback to current
      const total = grades.reduce((sum, g) => sum + (g.score / g.assignment.maxScore) * 100, 0);
      return total / grades.length;
    };

    const scoreLastWeek = avgScore(gradesLastWeek);
    const scoreTwoWeeksAgo = avgScore(gradesTwoWeeksAgo);
    const currentScore = fg.finalScore;

    // Days since last grade
    const lastGradeDate = studentGrades[0]?.createdAt
      ? new Date(studentGrades[0].createdAt)
      : now;
    const daysSinceLast = Math.floor((now - lastGradeDate) / (1000 * 60 * 60 * 24));

    // Submission rate
    const assignmentsTotal = subject.assignments.length;
    const assignmentsSubmitted = studentGrades.length;
    const submissionRate = assignmentsTotal > 0 ? assignmentsSubmitted / assignmentsTotal : 0;

    // Class average (all students in this subject)
    const classScores = subject.finalGrades
      .filter((sfg) => sfg.finalScore !== null)
      .map((sfg) => sfg.finalScore);
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

  return features;
}

/**
 * Send features to FastAPI and get back risk predictions.
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
    console.error('[AIService] Prediction request failed:', err.message);
    // Fallback: rule-based scoring when FastAPI is unavailable
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

      return {
        student_id: f.student_id,
        subject_id: f.subject_id,
        risk_score: parseFloat(riskScore.toFixed(3)),
        risk_level: riskLevel,
      };
    });
  }
}

/**
 * Save risk scores to database.
 */
async function saveRiskScores(predictions) {
  for (const pred of predictions) {
    await prisma.riskScore.upsert({
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
      },
      update: {
        riskScore: pred.risk_score,
        riskLevel: pred.risk_level,
        calculatedAt: new Date(),
      },
    });
  }
}

/**
 * Create notifications for teachers when students cross high-risk threshold.
 */
async function createRiskNotifications(predictions) {
  const highRisk = predictions.filter((p) => p.risk_level === 'high');

  for (const pred of highRisk) {
    // Get student info
    const student = await prisma.user.findUnique({
      where: { id: pred.student_id },
      select: { id: true, name: true, schoolId: true },
    });
    const subject = await prisma.subject.findUnique({
      where: { id: pred.subject_id },
      select: { id: true, name: true, teacherId: true },
    });

    if (!student || !subject || !subject.teacherId) continue;

    await prisma.notification.create({
      data: {
        schoolId: student.schoolId,
        recipientId: subject.teacherId,
        type: 'risk_alert',
        title: `⚠️ High Risk: ${student.name}`,
        body: `${student.name} is at high risk of dropout in ${subject.name}. Risk score: ${(pred.risk_score * 100).toFixed(0)}%. Immediate attention recommended.`,
      },
    });
  }
}

module.exports = { buildRiskFeatures, getPredictions, saveRiskScores, createRiskNotifications };
