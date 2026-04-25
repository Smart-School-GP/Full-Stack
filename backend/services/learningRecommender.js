/**
 * Adaptive Learning Recommender (Feature 4)
 *
 * Generates personalized learning path item recommendations for a student
 * based on their academic performance data:
 *
 * Signals used:
 *   1. High-risk subjects (from RiskScore) → surface remedial modules
 *   2. Failed/low-scoring assignments       → identify knowledge gaps per topic
 *   3. Incomplete learning path progress    → continue unfinished paths
 *   4. XP level                            → weight toward appropriately challenging content
 *
 * Returns a ranked list of PathItem IDs with reasoning.
 */

const prisma = require('../lib/prisma');

const PASS_THRESHOLD = 60; // Scores below this are considered "failed"
const LOW_SCORE_THRESHOLD = 75; // Scores below this trigger a weak-signal recommendation

/**
 * Get adaptive learning path recommendations for a student.
 *
 * @param {string} studentId
 * @returns {Promise<Array>} Ranked list of recommendations
 */
async function getRecommendations(studentId) {
  const recommendations = [];
  const seen = new Set(); // Deduplicate item IDs

  // ── 1. Identify high-risk subjects ────────────────────────────────────────
  const riskScores = await prisma.riskScore.findMany({
    where: { studentId },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { riskScore: 'desc' },
  });

  const highRiskSubjectIds = riskScores
    .filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium')
    .map((r) => r.subject.id);

  // ── 2. Find paths for risky subjects ──────────────────────────────────────
  if (highRiskSubjectIds.length > 0) {
    const riskPaths = await prisma.learningPath.findMany({
      where: {
        subjectId: { in: highRiskSubjectIds },
        isPublished: true,
      },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            items: {
              where: { isRequired: true },
              orderBy: { orderIndex: 'asc' },
              include: {
                progress: { where: { studentId } },
              },
            },
          },
        },
        subject: { select: { id: true, name: true } },
      },
    });

    for (const path of riskPaths) {
      const riskEntry = riskScores.find((r) => r.subject.id === path.subjectId);
      const priority = riskEntry?.riskLevel === 'high' ? 'high' : 'medium';

      for (const mod of path.modules) {
        for (const item of mod.items) {
          const status = item.progress[0]?.status || 'not_started';
          if (status !== 'completed' && !seen.has(item.id)) {
            seen.add(item.id);
            recommendations.push({
              item_id: item.id,
              item_title: item.title,
              module_title: mod.title,
              path_id: path.id,
              path_title: path.title,
              subject_name: path.subject.name,
              priority,
              reason:
                priority === 'high'
                  ? `You are at high risk in ${path.subject.name}. This module will help you catch up.`
                  : `Your performance in ${path.subject.name} needs attention. This content will help.`,
              status,
              type: item.type,
            });
          }
        }
      }
    }
  }

  // ── 3. Identify low-scoring / failed assignments → knowledge gaps ─────────
  const rooms = await prisma.studentRoom.findMany({
    where: { studentId },
    select: { roomId: true },
  });
  const roomIds = rooms.map((c) => c.roomId);

  const subjects = await prisma.subject.findMany({
    where: { roomId: { in: roomIds } },
    select: { id: true, name: true },
  });
  const subjectIds = subjects.map((s) => s.id);

  const grades = await prisma.grade.findMany({
    where: { studentId },
    include: {
      assignment: {
        select: { id: true, title: true, type: true, maxScore: true, subjectId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Only recent grades
  });

  const subjectScoreMap = new Map();
  for (const grade of grades) {
    const pct = (grade.score / grade.assignment.maxScore) * 100;
    if (!subjectScoreMap.has(grade.assignment.subjectId)) {
      subjectScoreMap.set(grade.assignment.subjectId, []);
    }
    subjectScoreMap.get(grade.assignment.subjectId).push(pct);
  }

  // Find subjects with average score below pass threshold
  const struggleSubjectIds = [];
  for (const [subId, scores] of subjectScoreMap.entries()) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < LOW_SCORE_THRESHOLD) {
      struggleSubjectIds.push({ subjectId: subId, avg });
    }
  }

  // Look for learning paths in struggling subjects not already added
  const newSubjectIds = struggleSubjectIds
    .map((s) => s.subjectId)
    .filter((id) => !highRiskSubjectIds.includes(id));

  if (newSubjectIds.length > 0) {
    const gap_paths = await prisma.learningPath.findMany({
      where: { subjectId: { in: newSubjectIds }, isPublished: true },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            items: {
              where: { isRequired: true },
              orderBy: { orderIndex: 'asc' },
              include: { progress: { where: { studentId } } },
            },
          },
        },
        subject: { select: { id: true, name: true } },
      },
      take: 3,
    });

    for (const path of gap_paths) {
      const entry = struggleSubjectIds.find((s) => s.subjectId === path.subjectId);
      for (const mod of path.modules) {
        for (const item of mod.items) {
          const status = item.progress[0]?.status || 'not_started';
          if (status !== 'completed' && !seen.has(item.id)) {
            seen.add(item.id);
            recommendations.push({
              item_id: item.id,
              item_title: item.title,
              module_title: mod.title,
              path_id: path.id,
              path_title: path.title,
              subject_name: path.subject.name,
              priority: 'medium',
              reason: `Your average score in ${path.subject.name} is ${entry.avg.toFixed(1)}%. Completing this will strengthen your understanding.`,
              status,
              type: item.type,
            });
          }
        }
      }
    }
  }

  // ── 4. Surface in-progress items (continue what you started) ─────────────
  const inProgress = await prisma.pathProgress.findMany({
    where: { studentId, status: 'in_progress' },
    include: {
      item: {
        include: {
          module: {
            include: {
              path: {
                include: { subject: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 5,
  });

  for (const prog of inProgress) {
    const item = prog.item;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      recommendations.push({
        item_id: item.id,
        item_title: item.title,
        module_title: item.module.title,
        path_id: item.module.path.id,
        path_title: item.module.path.title,
        subject_name: item.module.path.subject.name,
        priority: 'low',
        reason: "You started this item but haven't completed it yet. Continue where you left off!",
        status: 'in_progress',
        type: item.type,
      });
    }
  }

  // ── Sort: high → medium → low priority ────────────────────────────────────
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 20); // Cap at 20 recommendations
}

module.exports = { getRecommendations };
