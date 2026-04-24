const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock Prisma before requiring the app
jest.mock('../../src/lib/prisma', () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  timetablePeriod: {
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  class: {
    findFirst: jest.fn(),
  },
}));

const prisma = require('../../src/lib/prisma');

// Define dummy secret for testing
process.env.JWT_SECRET = 'test_secret_for_auth';
process.env.FRONTEND_URL = 'http://localhost:3000'; // To pass CORS check in app.js
process.env.NODE_ENV = 'test';

// Import the app
const app = require('../../src/app');

// Helper to generate a test token
function generateToken(payload) {
  return jwt.sign(
    {
      id: 'test-user-id',
      school_id: 'school-A',
      role: 'admin',
      isActive: true,
      ...payload,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Cross-School Authorization Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/export/student/:studentId/grades', () => {
    it('should return 403 Forbidden when trying to access a student from another school', async () => {
      // Simulate that the student is NOT found in the requester's school
      prisma.user.findFirst.mockResolvedValue(null);

      const token = generateToken({ role: 'admin' });

      const res = await request(app)
        .get('/api/export/student/other-school-student-id/grades')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-school-student-id', schoolId: 'school-A' },
        select: { id: true },
      });
    });

    it('should proceed if the student belongs to the same school', async () => {
      // Simulate that the student IS found
      prisma.user.findFirst.mockResolvedValue({ id: 'same-school-student-id' });
      // We don't care about the rest of the execution for this test, so we can let it fail later or mock the next step
      // But we just want to check it doesn't return 403 immediately.
      
      // Mocking the grade query so it doesn't crash
      prisma.grade = { findMany: jest.fn().mockResolvedValue([]) };

      const token = generateToken({ role: 'admin' });

      const res = await request(app)
        .get('/api/export/student/same-school-student-id/grades')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).not.toBe(403);
    });
  });

  describe('DELETE /api/timetable/periods/:periodId', () => {
    it('should return 404/403 when admin tries to delete a period from another school', async () => {
      // The timetable.js route returns 404 if the period doesn't belong to the school
      prisma.timetablePeriod.findFirst.mockResolvedValue(null);

      const token = generateToken({ role: 'admin' });

      const res = await request(app)
        .delete('/api/timetable/periods/other-school-period-id')
        .set('Authorization', `Bearer ${token}`);

      // The current implementation returns 404 for cross-tenant periods, acting as a security guard
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Period not found');
      expect(prisma.timetablePeriod.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-school-period-id', schoolId: 'school-A' },
      });
    });
  });

  describe('GET /api/attendance/class/:classId', () => {
    it('should return 403 when trying to access attendance for a class from another school', async () => {
      // Simulate class not found in requester's school
      prisma.class.findFirst.mockResolvedValue(null);

      const token = generateToken({ role: 'teacher' });

      const res = await request(app)
        .get('/api/attendance/class/other-school-class-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('Access denied');
      expect(prisma.class.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-school-class-id', schoolId: 'school-A' },
        select: { id: true },
      });
    });
  });
});
