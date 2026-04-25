const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const { authenticate, requireRole } = require('../middleware/auth');

const prisma = require("../lib/prisma");

// All owner routes require auth + owner role
router.use(authenticate, requireRole('owner'));

/**
 * GET /api/owner/schools
 * List all schools in the platform
 */
router.get('/schools', async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/owner/admins
 * Create a new administrator for a specific school
 */
router.post('/admins', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    // Verify school exists
    const school = await prisma.school.findFirst();
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'admin',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    console.log(`[OWNER] Created new admin ${email} for school ${school.name}`);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
