const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/auth.schemas');
const logger = require('../lib/logger');
const prisma = require("../lib/prisma");

function createMailTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendResetEmail(email, resetUrl) {
  const transport = createMailTransport();
  if (!transport) {
    // In development, log the URL so it can be used without email
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[AUTH] Password reset URL (no SMTP configured)', { email, resetUrl });
    }
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Password Reset Request',
    text: `Click the link to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Click the link to reset your password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`,
  });
}

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

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent user enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashedToken, passwordResetExpiresAt: expiresAt },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    await sendResetEmail(email, resetUrl);

    logger.info('[AUTH] Password reset requested', { userId: user.id });
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, email, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        email,
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Reset token is invalid or has expired.' } });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        lastPasswordChange: new Date(),
      },
    });

    logger.info('[AUTH] Password reset completed', { userId: user.id });
    res.json({ success: true, message: 'Password has been reset. Please log in with your new password.' });
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
