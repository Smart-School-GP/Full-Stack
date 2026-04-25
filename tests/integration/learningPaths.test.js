const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/lib/prisma', () => ({
  learningPath: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  pathModule: {
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  pathItem: {
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  pathProgress: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  subject: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  riskScore: {
    findMany: jest.fn(),
  },
  grade: {
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  studentClass: {
    findMany: jest.fn(),
  },
}));

const prisma = require('../../src/lib/prisma');

process.env.JWT_SECRET = 'test_secret_for_auth';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

const app = require('../../src/app');

function generateToken(payload) {
  return jwt.sign(
    {
      id: 'test-teacher-id',
      school_id: 'school-A',
      role: 'teacher',
      isActive: true,
      ...payload,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function generateStudentToken(payload) {
  return jwt.sign(
    {
      id: 'test-student-id',
      school_id: 'school-A',
      role: 'student',
      isActive: true,
      ...payload,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Learning Paths API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/learning-paths', () => {
    it('should create a learning path as teacher', async () => {
      const token = generateToken();
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1', teacherId: 'test-teacher-id' });
      prisma.learningPath.create.mockResolvedValue({
        id: 'path-1',
        title: 'Math Basics',
        subjectId: 'subject-1',
      });

      const res = await request(app)
        .post('/api/learning-paths')
        .set('Authorization', `Bearer ${token}`)
        .send({ subject_id: 'subject-1', title: 'Math Basics', description: 'Basic math' });

      expect(res.status).toBe(201);
      expect(prisma.learningPath.create).toHaveBeenCalled();
    });

    it('should reject unauthorized user', async () => {
      const token = 'invalid-token';

      const res = await request(app)
        .post('/api/learning-paths')
        .set('Authorization', `Bearer ${token}`)
        .send({ subject_id: 'subject-1', title: 'Math Basics' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/learning-paths/subject/:subjectId', () => {
    it('should return paths for a subject', async () => {
      const token = generateToken();
      prisma.learningPath.findMany.mockResolvedValue([
        { id: 'path-1', title: 'Path 1', _count: { modules: 3 } },
      ]);

      const res = await request(app)
        .get('/api/learning-paths/subject/subject-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return only published paths for students', async () => {
      const token = generateStudentToken();
      prisma.learningPath.findMany.mockResolvedValue([
        { id: 'path-1', title: 'Path 1', isPublished: true },
      ]);

      const res = await request(app)
        .get('/api/learning-paths/subject/subject-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/learning-paths/my', () => {
    it('should return published paths for students across their subjects', async () => {
      const token = generateStudentToken();
      prisma.studentClass.findMany.mockResolvedValue([{ classId: 'class-1' }]);
      prisma.subject.findMany.mockResolvedValue([{ id: 'subject-1' }]);
      prisma.learningPath.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/learning-paths/my')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(prisma.learningPath.findMany).toHaveBeenCalled();
    });
  });
});