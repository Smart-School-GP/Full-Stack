const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { authenticate } = require('../middleware/auth');

const prisma = require("../lib/prisma");

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.warn(`[AUTH] Login failed: User not found - ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.warn(`[AUTH] Login failed: Invalid password - ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account is suspended. Contact your administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, school_id: user.schoolId, role: user.role, name: user.name, isActive: user.isActive },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log(`[AUTH] Login successful: ${email} (${user.role})`);

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, school_id: user.schoolId },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
