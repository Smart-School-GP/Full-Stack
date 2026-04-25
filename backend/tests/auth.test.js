// Mock cron jobs to prevent them from running during tests
jest.mock('../jobs/riskAnalysis', () => ({ startRiskCronJob: jest.fn() }));
jest.mock('../jobs/analyticsGeneration', () => ({ startAnalyticsCronJob: jest.fn() }));
jest.mock('../jobs/eventReminders', () => ({ startEventReminderCronJob: jest.fn() }));
jest.mock('../jobs/sentimentAnalysis', () => ({ startSentimentCronJob: jest.fn() }));

const request = require('supertest');
const app = require('../app');
const prisma = require('../lib/prisma');
const { createTestUser, cleanupDatabase } = require('./helpers');

describe('Auth API', () => {
  let testUser;

  beforeAll(async () => {
    // Note: In a real CI, we'd use a separate test DB
    // For this environment, we'll just create unique users
    const result = await createTestUser('teacher');
    testUser = result.user;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.name).toBe(testUser.name);
    });

    it('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrong-password'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info when authenticated', async () => {
      // First login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123'
        });
      
      const token = loginRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.role).toBe('teacher');
    });

    it('should fail when no token provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toEqual(401);
    });
  });
});
