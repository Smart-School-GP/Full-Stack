const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, school_id, role, name }
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

// Ensure resource belongs to user's school
function requireSchool(req, res, next) {
  const resourceSchoolId = req.params.schoolId || req.body.school_id;
  if (resourceSchoolId && resourceSchoolId !== req.user.school_id) {
    return res.status(403).json({ error: 'Forbidden: Cross-school access denied' });
  }
  next();
}

module.exports = { authenticate, requireRole, requireSchool };
