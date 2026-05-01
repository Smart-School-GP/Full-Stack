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
    res.json({ success: true, data: schools });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * POST /api/owner/admins
 * Create a new administrator for a specific school
 */
router.post('/admins', async (req, res) => {
  try {
    const { name, email, password, school_name } = req.body;

    if (!name || !email || !password || !school_name) {
      return res.status(400).json({ success: false, error: { message: 'name, email, password, and school_name are required' } });
    }

    // Find or create the school by name
    let school = await prisma.school.findFirst({
      where: { name: { equals: school_name } }
    });

    if (!school) {
      school = await prisma.school.create({
        data: { name: school_name }
      });
      console.log(`[OWNER] Created new school: ${school_name}`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'admin',
        mustChangePassword: true,
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
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: { message: 'Email already in use' } });
    }
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

module.exports = router;
