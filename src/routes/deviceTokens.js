const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

router.use(authenticate);

router.post('/device-token', async (req, res) => {
  try {
    const { token, platform } = req.body;
    
    if (!token || !platform) {
      return res.status(400).json({ error: 'token and platform required' });
    }

    const validPlatforms = ['web', 'android', 'ios'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    await prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId: req.user.id,
          token,
        },
      },
      create: {
        userId: req.user.id,
        token,
        platform,
      },
      update: {
        token,
        platform,
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/device-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'token required' });
    }

    await prisma.deviceToken.deleteMany({
      where: {
        userId: req.user.id,
        token,
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
