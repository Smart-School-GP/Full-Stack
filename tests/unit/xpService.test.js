const { awardXP, updateLoginStreak, getStudentXPData, calculateLevel, XP_REWARDS } = require('../../src/services/xpService');
const prisma = require('../../src/lib/prisma');

jest.mock('../../src/lib/prisma', () => ({
  studentXP: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  studentBadge: {
    findMany: jest.fn(),
  },
}));

describe('xpService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      const result = calculateLevel(0);
      expect(result.level).toBe(1);
      expect(result.currentXP).toBe(0);
    });

    it('should return level 2 for 100 XP', () => {
      const result = calculateLevel(100);
      expect(result.level).toBe(2);
    });

    it('should calculate correct progress percentage', () => {
      const result = calculateLevel(50);
      expect(result.percentage).toBe(50);
    });

    it('should handle level 3+ for higher XP', () => {
      const result = calculateLevel(250);
      expect(result.level).toBe(3);
    });
  });

  describe('awardXP', () => {
    it('should not award invalid amounts', async () => {
      await awardXP('student-1', 0);
      await awardXP('student-1', -5);
      expect(prisma.studentXP.findUnique).not.toHaveBeenCalled();
    });

    it('should create XP record if none exists', async () => {
      prisma.studentXP.findUnique.mockResolvedValue(null);
      prisma.studentXP.create.mockResolvedValue({ studentId: 'student-1', totalXP: 10, level: 1 });

      await awardXP('student-1', 10);

      expect(prisma.studentXP.create).toHaveBeenCalled();
    });

    it('should update existing XP record', async () => {
      prisma.studentXP.findUnique.mockResolvedValue({ studentId: 'student-1', totalXP: 50, level: 1 });
      prisma.studentXP.update.mockResolvedValue({ studentId: 'student-1', totalXP: 65, level: 2 });

      await awardXP('student-1', 15);

      expect(prisma.studentXP.update).toHaveBeenCalled();
    });

    it('should not create notification on level stay', async () => {
      prisma.studentXP.findUnique.mockResolvedValue({ studentId: 'student-1', totalXP: 50, level: 1 });
      prisma.studentXP.update.mockResolvedValue({ studentId: 'student-1', totalXP: 55, level: 1 });
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });

      await awardXP('student-1', 5);

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create notification on level up', async () => {
      prisma.studentXP.findUnique.mockResolvedValue({ studentId: 'student-1', totalXP: 90, level: 1 });
      prisma.studentXP.update.mockResolvedValue({ studentId: 'student-1', totalXP: 115, level: 2 });
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });

      await awardXP('student-1', 25);

      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('updateLoginStreak', () => {
    it('should create new record if none exists', async () => {
      prisma.studentXP.findUnique.mockResolvedValue(null);
      prisma.studentXP.create.mockResolvedValue({ studentId: 'student-1', currentStreak: 1 });

      await updateLoginStreak('student-1');

      expect(prisma.studentXP.create).toHaveBeenCalled();
    });

    it('should increment streak on consecutive day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      prisma.studentXP.findUnique.mockResolvedValue({
        studentId: 'student-1',
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: yesterday,
      });
      prisma.studentXP.update.mockResolvedValue({});

      await updateLoginStreak('student-1');

      expect(prisma.studentXP.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStreak: 6 }),
        })
      );
    });
  });

  describe('getStudentXPData', () => {
    it('should return default values if no XP record', async () => {
      prisma.studentXP.findUnique.mockResolvedValue(null);
      prisma.studentBadge.findMany.mockResolvedValue([]);

      const result = await getStudentXPData('student-1');

      expect(result.totalXP).toBe(0);
      expect(result.level).toBe(1);
    });

    it('should include earned badges', async () => {
      prisma.studentXP.findUnique.mockResolvedValue({ studentId: 'student-1', totalXP: 100, level: 2 });
      prisma.studentBadge.findMany.mockResolvedValue([
        { badge: { id: 'b1', name: 'First Badge' } },
      ]);

      const result = await getStudentXPData('student-1');

      expect(result.earnedBadges).toHaveLength(1);
      expect(result.earnedBadges[0].name).toBe('First Badge');
    });
  });

  describe('XP_REWARDS', () => {
    it('should have all expected reward values', () => {
      expect(XP_REWARDS.path_item_completed).toBe(15);
      expect(XP_REWARDS.path_completed).toBe(50);
      expect(XP_REWARDS.discussion_post).toBe(10);
      expect(XP_REWARDS.discussion_reply).toBe(8);
      expect(XP_REWARDS.badge_earned).toBe(0);
    });
  });
});