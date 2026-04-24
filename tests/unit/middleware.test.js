const { authenticate, requireRole } = require('../../src/middleware/auth');

const createMockReq = (overrides = {}) => ({
  headers: {},
  user: null,
  ...overrides,
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = () => jest.fn();

describe('auth middleware', () => {
  describe('requireRole', () => {
    it('should call next with error if user role not allowed', () => {
      const req = createMockReq({ user: { role: 'student' } });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireRole('teacher', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Access denied' }));
    });

    it('should allow access for correct role', () => {
      const req = createMockReq({ user: { role: 'teacher' } });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireRole('teacher');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow admin for any restricted role', () => {
      const req = createMockReq({ user: { role: 'admin' } });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireRole('teacher');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});

describe('validate middleware', () => {
  const validate = require('../../src/middleware/validate');

  it('should call next if validation passes', async () => {
    const schema = {
      validate: jest.fn().mockReturnValue({ error: undefined }),
    };
    const req = createMockReq({ body: { name: 'test' } });
    const res = createMockRes();
    const next = createMockNext();

    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with error if validation fails', async () => {
    const schema = {
      validate: jest.fn().mockReturnValue({
        error: { details: [{ message: 'Name required' }] },
      }),
    };
    const req = createMockReq({ body: {} });
    const res = createMockRes();
    const next = createMockNext();

    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Name required' }));
  });
});

describe('schoolValidation middleware', () => {
  const schoolValidation = require('../../src/middleware/schoolValidation');
  const prisma = require('../../src/lib/prisma');

  jest.mock('../../src/lib/prisma', () => ({
    school: {
      findUnique: jest.fn(),
    },
  }));

  it('should call next if school exists', async () => {
    prisma.school.findUnique.mockResolvedValue({ id: 'school-1', name: 'Test School' });
    const req = createMockReq({ user: { school_id: 'school-1' } });
    const res = createMockRes();
    const next = createMockNext();

    await schoolValidation(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with error if school not found', async () => {
    prisma.school.findUnique.mockResolvedValue(null);
    const req = createMockReq({ user: { school_id: 'invalid' } });
    const res = createMockRes();
    const next = createMockNext();

    await schoolValidation(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'School not found' }));
  });
});