const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // { id, role, name, isActive, iat }
    if (decoded.isActive === false) {
      return res.status(403).json({ error: 'Account is suspended. Contact your administrator.' });
    }

    // Invalidate tokens issued before last password change
    if (decoded.iat) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { lastPasswordChange: true, isActive: true },
      });
      if (user?.lastPasswordChange) {
        const tokenIssuedAt = decoded.iat * 1000;
        if (tokenIssuedAt < user.lastPasswordChange.getTime()) {
          return res.status(401).json({ error: 'Unauthorized: Session expired after password change. Please log in again.' });
        }
      }
      if (user?.isActive === false) {
        return res.status(403).json({ error: 'Account is suspended. Contact your administrator.' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
