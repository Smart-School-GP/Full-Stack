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
 * Build the full analytics payload for the platform.
 * Optimized to use bulk fetching and minimize N+1 queries.
 */
async function buildAnalyticsPayload() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error(`School not found`);

  const weekStart = getWeekStart();
  const lastWeekStart = getLastWeekStart();
  const weekStartDate = new Date(weekStart);
  const lastWeekStartDate = new Date(lastWeekStart);

  // 1. Fetch core counts
  const totalStudents = await prisma.user.count({ where: { role: 'student' } });
  const riskCurrent = await prisma.riskScore.findMany({ select: { riskLevel: true } });
  const highRiskCurrent = riskCurrent.filter(r => r.riskLevel === 'high').length;
  const mediumRiskCurrent = riskCurrent.filter(r => r.riskLevel === 'medium').length;

  // 2. Estimate last week's risk (proxy)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newRiskAlerts = await prisma.notification.count({
    where: { type: 'risk_alert', createdAt: { gte: oneWeekAgo } },
  });
  const highRiskLast = Math.max(0, highRiskCurrent - newRiskAlerts);

  // 3. Bulk fetch ALL relevant data for rooms, subjects, and grades
  const rooms = await prisma.room.findMany({
    include: {
      students: { select: { studentId: true } },
      subjects: {
        include: {
          assignments: { select: { id: true } },
          finalGrades: true
        }
      }
    }
  });

  // Fetch student-level assignment participation across all subjects
  // (We need to know which students have at least one grade in a subject)
  const studentSubjectGrades = await prisma.grade.findMany({
    select: { studentId: true, assignment: { select: { subjectId: true } } }
  });

  // Create a lookup for assignment completion (subjectId -> Set of studentIds)
  const completionMap = new Map();
  for (const g of studentSubjectGrades) {
    if (!g.assignment) continue;
    const subId = g.assignment.subjectId;
    if (!completionMap.has(subId)) completionMap.set(subId, new Set());
    completionMap.get(subId).add(g.studentId);
  }

  const roomData = [];
  for (const cls of rooms) {
    if (!cls.subjects.length) continue;

    const subjectData = [];
    for (const sub of cls.subjects) {
      // Calculate averages from pre-fetched finalGrades
      const validGrades = sub.finalGrades.filter(g => g.finalScore !== null);
      const gradesThis = validGrades.filter(g => g.updatedAt >= weekStartDate);
      const gradesLast = validGrades.filter(g => g.updatedAt >= lastWeekStartDate);

      const avgThis = gradesThis.length ? gradesThis.reduce((s, g) => s + g.finalScore, 0) / gradesThis.length : null;
      const avgLast = gradesLast.length ? gradesLast.reduce((s, g) => s + g.finalScore, 0) / gradesLast.length : null;
      
      const belowPassing = validGrades.filter(g => g.finalScore < 50).length;
      
      // Completion rate calculation using lookup map
      const studentsInRoom = cls.students.length;
      const studentsWithGradesInSubject = completionMap.get(sub.id)?.size || 0;
      const hasAssignments = sub.assignments.length > 0;
      const completionRate = (studentsInRoom > 0 && hasAssignments) ? Math.min(studentsWithGradesInSubject / studentsInRoom, 1) : 0;

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

    const clsAvgThis = subjectData.reduce((s, x) => s + x.average_score, 0) / subjectData.length;
    const clsAvgLast = subjectData.reduce((s, x) => s + x.average_last_week, 0) / subjectData.length;

    roomData.push({
      room_id: cls.id,
      room_name: cls.name,
      average_score: parseFloat(clsAvgThis.toFixed(2)),
      average_last_week: parseFloat(clsAvgLast.toFixed(2)),
      subjects: subjectData,
    });
  }

  const overallThis = roomData.length > 0 ? roomData.reduce((s, c) => s + c.average_score, 0) / roomData.length : 0;
  const overallLast = roomData.length > 0 ? roomData.reduce((s, c) => s + c.average_last_week, 0) / roomData.length : 0;

  return {
    school_name: school.name,
    week_start: weekStart,
    total_students: totalStudents,
    total_rooms: roomData.length,
    overall_average_this_week: parseFloat(overallThis.toFixed(2)),
    overall_average_last_week: parseFloat(overallLast.toFixed(2)),
    high_risk_count: highRiskCurrent,
    medium_risk_count: mediumRiskCurrent,
    high_risk_change: highRiskCurrent - highRiskLast,
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

  if (result.subject_insights?.length) {
    // Process insights in chunks to avoid overwhelming the DB
    for (const insight of result.subject_insights) {
      if (!insight.subject_id || !insight.room_id) continue;
      await prisma.subjectInsight.upsert({
        where: { id: `${insight.subject_id}-${insight.room_id}` },
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
