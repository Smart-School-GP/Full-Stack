
const prisma = require("../lib/prisma");

/**
 * Returns the ISO date string for Monday of the current week.
 */
function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon ...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

/**
 * Returns the ISO date string for Monday of last week.
 */
function getLastWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
  const lastMonday = new Date(now.setDate(diff));
  return lastMonday.toISOString().slice(0, 10);
}

/**
 * Compute the average final score for a subject.
 * If weekStart is provided, only count grades updated on/after that date.
 */
async function getSubjectAverage(subjectId, weekStart = null) {
  const where = { subjectId, finalScore: { not: null } };
  if (weekStart) {
    where.updatedAt = { gte: new Date(weekStart) };
  }
  const grades = await prisma.finalGrade.findMany({ where });
  if (!grades.length) return null;
  return grades.reduce((sum, g) => sum + g.finalScore, 0) / grades.length;
}

/**
 * Count students below 50% in a subject.
 */
async function getStudentsBelowPassing(subjectId) {
  const count = await prisma.finalGrade.count({
    where: { subjectId, finalScore: { lt: 50, not: null } },
  });
  return count;
}

/**
 * Compute assignment completion rate for a subject.
 * = (students who have at least one grade) / (total enrolled students)
 */
async function getAssignmentCompletionRate(subjectId) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { room: { include: { students: true } }, assignments: true },
  });
  if (!subject || !subject.room.students.length || !subject.assignments.length) return 0;

  const totalStudents = subject.room.students.length;
  const studentsWithGrades = await prisma.grade.groupBy({
    by: ['studentId'],
    where: { assignment: { subjectId } },
  });
  return Math.min(studentsWithGrades.length / totalStudents, 1);
}

/**
 * Get current risk counts across all students.
 */
async function getRiskCounts() {
  const scores = await prisma.riskScore.findMany({
    where: {},
    select: { riskLevel: true },
  });
  const high = scores.filter((s) => s.riskLevel === 'high').length;
  const medium = scores.filter((s) => s.riskLevel === 'medium').length;
  return { high, medium };
}

/**
 * Estimate last week's risk counts from stored notifications
 * (since we don't snapshot risk scores over time, we use a best-effort approach).
 */
async function getRiskCountsLastWeek() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Count risk_alert notifications created in the last week as a proxy
  const count = await prisma.notification.count({
    where: { type: 'risk_alert', createdAt: { gte: oneWeekAgo } },
  });
  // Conservative estimate: return current minus new alerts
  const current = await getRiskCounts();
  return { high: Math.max(0, current.high - count), medium: current.medium };
}

/**
 * Build the full analytics payload for the platform.
 */
async function buildAnalyticsPayload() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error(`School not found`);

  const weekStart = getWeekStart();
  const lastWeekStart = getLastWeekStart();

  // Total students
  const totalStudents = await prisma.user.count({
    where: { role: 'student' },
  });

  // All rooms with subjects
  const rooms = await prisma.room.findMany({
    where: {},
    include: { subjects: true },
  });

  const riskCurrent = await getRiskCounts();
  const riskLast = await getRiskCountsLastWeek();

  // Build per-room, per-subject data
  const roomData = [];
  for (const cls of rooms) {
    if (!cls.subjects.length) continue;

    const subjectData = [];
    for (const sub of cls.subjects) {
      const avgThis = await getSubjectAverage(sub.id, weekStart);
      const avgLast = await getSubjectAverage(sub.id, lastWeekStart);
      const belowPassing = await getStudentsBelowPassing(sub.id);
      const completionRate = await getAssignmentCompletionRate(sub.id);

      subjectData.push({
        subject_id: sub.id,
        subject_name: sub.name,
        average_score: avgThis ?? 0,
        average_last_week: avgLast ?? avgThis ?? 0,
        students_below_passing: belowPassing,
        assignment_completion_rate: completionRate,
      });
    }

    if (!subjectData.length) continue;

    const clsAvgThis =
      subjectData.reduce((s, x) => s + x.average_score, 0) / subjectData.length;
    const clsAvgLast =
      subjectData.reduce((s, x) => s + x.average_last_week, 0) / subjectData.length;

    roomData.push({
      room_id: cls.id,
      room_name: cls.name,
      average_score: parseFloat(clsAvgThis.toFixed(2)),
      average_last_week: parseFloat(clsAvgLast.toFixed(2)),
      subjects: subjectData,
    });
  }

  const overallThis =
    roomData.length > 0
      ? roomData.reduce((s, c) => s + c.average_score, 0) / roomData.length
      : 0;
  const overallLast =
    roomData.length > 0
      ? roomData.reduce((s, c) => s + c.average_last_week, 0) / roomData.length
      : 0;

  return {
    school_name: school.name,
    week_start: weekStart,
    total_students: totalStudents,
    total_rooms: roomData.length,
    overall_average_this_week: parseFloat(overallThis.toFixed(2)),
    overall_average_last_week: parseFloat(overallLast.toFixed(2)),
    high_risk_count: riskCurrent.high,
    medium_risk_count: riskCurrent.medium,
    high_risk_change: riskCurrent.high - riskLast.high,
    rooms: roomData,
  };
}

/**
 * Save a completed analytics report to the database.
 */
async function saveAnalyticsReport(result, weekStart, reportType = 'manual') {
  const report = await prisma.analyticsReport.upsert({
    where: { weekStart },
    create: {
      reportType,
      weekStart,
      schoolSummary: result.school_summary,
      atRiskSummary: result.at_risk_summary,
      recommendedActions: JSON.stringify(result.recommended_actions || []),
      subjectInsightsJson: JSON.stringify(result.subject_insights || []),
    },
    update: {
      reportType,
      schoolSummary: result.school_summary,
      atRiskSummary: result.at_risk_summary,
      recommendedActions: JSON.stringify(result.recommended_actions || []),
      subjectInsightsJson: JSON.stringify(result.subject_insights || []),
      generatedAt: new Date(),
    },
  });

  // Upsert per-subject insights
  if (result.subject_insights?.length) {
    for (const insight of result.subject_insights) {
      if (!insight.subject_id || !insight.room_id) continue;
      await prisma.subjectInsight.upsert({
        where: {
          id: `${insight.subject_id}-${insight.room_id}`,
        },
        create: {
          id: `${insight.subject_id}-${insight.room_id}`,
          subjectId: insight.subject_id,
          roomId: insight.room_id,
          insightText: insight.insight_text,
          averageScore: insight.average_score ?? null,
          trend: insight.trend ?? 'stable',
        },
        update: {
          insightText: insight.insight_text,
          averageScore: insight.average_score ?? null,
          trend: insight.trend ?? 'stable',
          generatedAt: new Date(),
        },
      });
    }
  }

  return report;
}

module.exports = {
  buildAnalyticsPayload,
  saveAnalyticsReport,
  getWeekStart,
};
