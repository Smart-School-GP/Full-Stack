const teacherService = require('../../src/services/teacherService');
const prisma = require('../../src/lib/prisma');

jest.mock('../../src/lib/prisma', () => ({
  teacherClass: {
    findMany: jest.fn(),
  },
  subject: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  assignment: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  grade: {
    findMany: jest.fn(),
  },
}));

describe('teacherService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listTeacherClasses', () => {
    it('should list classes for a teacher', async () => {
      const mockTeacherClasses = [
        { class: { id: 'c1', name: 'Class 1', _count: { students: 10, subjects: 2 } } }
      ];
      prisma.teacherClass.findMany.mockResolvedValue(mockTeacherClasses);

      const result = await teacherService.listTeacherClasses('t1');
      
      expect(prisma.teacherClass.findMany).toHaveBeenCalledWith({
        where: { teacherId: 't1' },
        include: {
          class: {
            include: { _count: { select: { students: true, subjects: true } } },
          },
        },
      });
      expect(result).toEqual([{ id: 'c1', name: 'Class 1', _count: { students: 10, subjects: 2 } }]);
    });
  });

  describe('createAssignment', () => {
    it('should create an assignment', async () => {
      const data = { subject_id: 's1', title: 'Exam 1', type: 'exam', max_score: 100 };
      prisma.subject.findFirst.mockResolvedValue({ id: 's1' });
      prisma.assignment.create.mockResolvedValue({ id: 'a1', title: 'Exam 1' });

      const result = await teacherService.createAssignment('t1', data);

      expect(prisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', teacherId: 't1' },
      });
      expect(prisma.assignment.create).toHaveBeenCalled();
      expect(result.id).toBe('a1');
    });
  });
});
