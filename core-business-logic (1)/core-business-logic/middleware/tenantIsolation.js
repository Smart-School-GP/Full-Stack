/**
 * Multi-Tenant Data Isolation Middleware
 * Binds every incoming request to a verified school context.
 *
 * FIX: Tenant state (isActive, plan, schoolName) is now read directly from the
 * JWT payload instead of firing a DB lookup on every request.
 *
 * ┌─ At login/token-issue time ──────────────────────────────────────────────┐
 * │  Pack these claims into the JWT:                                         │
 * │    { schoolId, schoolName, plan, isActive }                              │
 * │                                                                          │
 * │  Mid-session revocation strategies (choose one):                         │
 * │    • Short-lived tokens (e.g. 15 min) + refresh-token rotation           │
 * │    • Redis blocklist keyed on `schoolId` for instant suspension          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const jwt = require('jsonwebtoken');

/**
 * Extracts and validates the tenant (school) from the JWT claims,
 * then attaches a scoped DB query helper to `req.tenant`.
 * Zero database round-trips per request.
 */
const tenantIsolation = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.schoolId) {
      return res.status(403).json({ error: 'Token does not contain a valid school context.' });
    }

    // FIX: Check suspension status from the JWT claim — no DB query needed.
    if (decoded.isActive === false) {
      return res.status(403).json({ error: 'Tenant account is suspended.' });
    }

    // Attach tenant context directly from token payload
    req.tenant = {
      schoolId: decoded.schoolId,
      schoolName: decoded.schoolName,
      plan: decoded.plan,

      /**
       * Injects a mandatory `schoolId` filter into any Sequelize query options.
       * Usage: Model.findAll(req.tenant.scope({ where: { studentId } }))
       *
       * @param {object} queryOptions - Sequelize query options object
       * @returns {object} Query options with tenant scope enforced
       */
      scope: (queryOptions = {}) => ({
        ...queryOptions,
        where: {
          ...(queryOptions.where ?? {}),
          schoolId: decoded.schoolId,
        },
      }),
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    next(err);
  }
};

module.exports = tenantIsolation;
