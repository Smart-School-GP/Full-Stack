const { checkAndAwardBadges } = require('../../src/services/badgeEngine');
const prisma = require('../../src/lib/prisma');

jest.mock('../../src/lib/prisma', () => ({
  badgeDefinition: {
    findMany: jest.fn(),
  },
  studentBadge: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  finalGrade: {
    findMany: jest.fn(),
  },
  attendance: {
    findMany: jest.fn(),
  },
  learningPath: {
    findMany: jest.fn(),
  },
  discussionThread: {
    count: jest.fn(),
  },
  discussionReply: {
    count: jest.fn(),
  },
  studentXP: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
}));

describe('badgeEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndAwardBadges - grade_average', () => {
    it('should award badge when grade average meets criteria', async () => {
      prisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b1', name: 'Honor Roll', criteriaType: 'grade_average', criteriaValue: 90, pointsValue: 50 },
      ]);
      prisma.studentBadge.findUnique.mockResolvedValue(null);
      prisma.finalGrade.findMany.mockResolvedValue([
        { finalScore: 95 },
        { finalScore: 92 },
      ]);
      prisma.studentBadge.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.notification.create.mockResolvedValue({});

      await checkAndAwardBadges('student-1', 'school-1', 'grade_average');

      expect(prisma.studentBadge.create).toHaveBeenCalled();
    });

    it('should not award if grade average is below criteria', async () => {
      prisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b1', name: 'Honor Roll', criteriaType: 'grade_average', criteriaValue: 90, pointsValue: 50 },
      ]);
      prisma.finalGrade.findMany.mockResolvedValue([
        { finalScore: 80 },
        { finalScore: 75 },
      ]);

      await checkAndAwardBadges('student-1', 'school-1', 'grade_average');

      expect(prisma.studentBadge.create).not.toHaveBeenCalled();
    });

    it('should skip already earned badges', async () => {
      prisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b1', name: 'Honor Roll', criteriaType: 'grade_average', criteriaValue: 90 },
      ]);
      prisma.studentBadge.findUnique.mockResolvedValue({ id: 'existing' });

      await checkAndAwardBadges('student-1', 'school-1', 'grade_average');

      expect(prisma.studentBadge.create).not.toHaveBeenCalled();
    });
  });

  describe('checkAndAwardBadges - attendance_rate', () => {
    it('should award badge when attendance rate meets criteria', async () => {
      prisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b2', name: 'Perfect Attendance', criteriaType: 'attendance_rate', criteriaValue: 95, pointsValue: 30 },
      ]);
      prisma.studentBadge.findUnique.mockResolvedValue(null);
      prisma.attendance.findMany.mockResolvedValue([
        { status: 'present' },
        { status: 'present' },
        { status: 'present' },
        { status: 'late' },
        { status: 'absent' },
      ]);
      prisma.studentBadge.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.notification.create.mockResolvedValue({});

      await checkAndAwardBadges('student-1', 'school-1', 'attendance_rate');

      expect(prisma.studentBadge.create).toHaveBeenCalled();
    });
  });

  describe('checkAndAwardBadges - path_completion', () => {
    it('should award badge when all paths completed', async () => {
      prisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b3', name: 'Path Master', criteriaType: 'path_completion', criteriaValue: 1, pointsValue: 40 },
      ]);
      prisma.studentBadge.findUnique.mockResolvedValue(null);
      prisma.learningPath.findMany.mockResolvedValue([
        {
          id: 'p1',
          modules: [{ items: [{ id: 'i1', progress: [{ status: 'completed' }] }] }],
        },
      ]);
      prisma.studentBadge.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.notification.create.mockResolvedValue({});

      await checkAndAwardBadges('student-1', 'school-1', 'path_completion');

      expect(prisma.studentBadge.create).toHaveBeenCalled();
    });
  });

  describe('checkAndAwardBadges - discussion_participation', () => {
    it('should award badge when discussion count meets criteria', async () => {
      prisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b4', name: 'Active Participant', criteriaType: 'discussion_participation', criteriaValue: 5, pointsValue: 20 },
      ]);
      prisma.studentBadge.findUnique.mockResolvedValue(null);
      prisma.discussionThread.count.mockResolvedValue(3);
      prisma.discussionReply.count.mockResolvedValue(4);
      prisma.studentBadge.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.notification.create.mockResolvedValue({});

      await checkAndAwardBadges('student-1', 'school-1', 'discussion_participation');

      expect(prisma.studentBadge.create).toHaveBeenCalled();
    });
  });

  describe('checkAndAwardBadges - streak', () => {
    it('should award badge when streak meets criteria', async () => {
      prisma.badgeDefinition.findMany.mockResolvedValue([
        { id: 'b5', name: 'Week Warrior', criteriaType: 'streak', criteriaValue: 7, pointsValue: 25 },
      ]);
      prisma.studentBadge.findUnique.mockResolvedValue(null);
      prisma.studentXP.findUnique.mockResolvedValue({ currentStreak: 10 });
      prisma.studentBadge.create.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.notification.create.mockResolvedValue({});

      await checkAndAwardBadges('student-1', 'school-1', 'streak');

      expect(prisma.studentBadge.create).toHaveBeenCalled();
    });
  });
});