const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../schemas/auth.schemas');
const logger = require('../lib/logger');
const prisma = require("../lib/prisma");

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      logger.error('[AUTH] JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server configuration error' } });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.warn('[AUTH] Login failed: User not found', { email });
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      logger.warn('[AUTH] Login failed: Invalid password', { email });
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Account is suspended. Contact your administrator.' } });
    }

    const token = jwt.sign(
      { id: user.id, school_id: user.schoolId, role: user.role, name: user.name, isActive: user.isActive },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('[AUTH] Login successful', { email, role: user.role, schoolId: user.schoolId });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, role: user.role, school_id: user.schoolId },
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  // JWT is stateless — client simply discards the token
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, schoolId: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
