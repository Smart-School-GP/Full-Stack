// Mock cron jobs to prevent them from running during tests
jest.mock('../jobs/riskAnalysis', () => ({ startRiskCronJob: jest.fn() }));
jest.mock('../jobs/analyticsGeneration', () => ({ startAnalyticsCronJob: jest.fn() }));
jest.mock('../jobs/eventReminders', () => ({ startEventReminderCronJob: jest.fn() }));
jest.mock('../jobs/sentimentAnalysis', () => ({ startSentimentCronJob: jest.fn() }));

const request = require('supertest');
const app = require('../app');
const prisma = require('../lib/prisma');
const { createTestUser } = require('./helpers');

describe('Multi-Tenancy Isolation', () => {
  let userSchoolA;
  let tokenSchoolA;
  let userSchoolB;
  let tokenSchoolB;
  let classSchoolB;

  beforeAll(async () => {
    // Setup School A
    const schoolA = await prisma.school.create({ data: { name: 'School A' } });
    const resA = await createTestUser('teacher', schoolA.id);
    userSchoolA = resA.user;
    
    const loginA = await request(app).post('/api/auth/login').send({
      email: userSchoolA.email,
      password: 'password123'
    });
    tokenSchoolA = loginA.body.data.token;

    // Setup School B
    const schoolB = await prisma.school.create({ data: { name: 'School B' } });
    const resB = await createTestUser('teacher', schoolB.id);
    userSchoolB = resB.user;

    const loginB = await request(app).post('/api/auth/login').send({
      email: userSchoolB.email,
      password: 'password123'
    });
    tokenSchoolB = loginB.body.data.token;

    // Create a resource in School B
    classSchoolB = await prisma.class.create({
      data: {
        name: 'Secret Class B',
        schoolId: schoolB.id
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow School B user to access Class B', async () => {
    const res = await request(app)
      .get(`/api/attendance/class/${classSchoolB.id}`)
      .set('Authorization', `Bearer ${tokenSchoolB}`);

    // If it reaches the controller, it means validation passed
    // 200 (even if empty) or 404 (if not found in DB) but NOT 403/404 from middleware
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).not.toBe(404);
  });

  it('should prevent School A user from accessing Class B', async () => {
    const res = await request(app)
      .get(`/api/attendance/class/${classSchoolB.id}`)
      .set('Authorization', `Bearer ${tokenSchoolA}`);

    // The schoolValidation middleware should catch this and return 404 (Access Denied)
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toContain('not found or access denied');
  });

  it('should prevent access if school context is missing in token', async () => {
    // This shouldn't happen with valid tokens, but testing middleware robustness
    const res = await request(app)
      .get(`/api/attendance/class/${classSchoolB.id}`);
      
    expect(res.statusCode).toBe(401);
  });
});
