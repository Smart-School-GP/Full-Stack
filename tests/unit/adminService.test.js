const adminService = require('../../src/services/adminService');
const prisma = require('../../src/lib/prisma');

jest.mock('../../src/lib/prisma', () => ({
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  class: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
}));

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should return a list of users for a school', async () => {
      const mockUsers = [{ id: '1', name: 'Test User' }];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await adminService.listUsers('school-1');
      
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('createUser', () => {
    it('should hash the password and create a user', async () => {
      const userData = { email: 'test@example.com', password: 'password123', name: 'Test', role: 'student' };
      prisma.user.create.mockResolvedValue({ id: '2', ...userData });

      const result = await adminService.createUser('school-1', userData);

      expect(prisma.user.create).toHaveBeenCalled();
      const createArgs = prisma.user.create.mock.calls[0][0];
      expect(createArgs.data.email).toBe(userData.email);
      expect(createArgs.data.passwordHash).toBeDefined();
      expect(createArgs.data.passwordHash).not.toBe(userData.password);
    });
  });

  describe('getLatestAnalytics', () => {
    it('should return null if no report found', async () => {
      prisma.analyticsReport = { findFirst: jest.fn().mockResolvedValue(null) };
      const result = await adminService.getLatestAnalytics('school-1');
      expect(result).toBeNull();
    });

    it('should return parsed report if found', async () => {
      const mockReport = {
        id: 'r1',
        recommendedActions: '["Action 1"]',
        subjectInsightsJson: '[]',
      };
      prisma.analyticsReport = { findFirst: jest.fn().mockResolvedValue(mockReport) };
      const result = await adminService.getLatestAnalytics('school-1');
      expect(result.recommended_actions).toEqual(['Action 1']);
    });
  });
});
