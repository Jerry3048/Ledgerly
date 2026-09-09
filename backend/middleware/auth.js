/* =========================================================
   LabLedger — auth middleware & role constants
   ========================================================= */
const db = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

const STAFF_ROLES     = ['admin', 'officer'];
const REQUESTER_ROLES = ['lecturer', 'student'];
const ALL_ROLES       = [...STAFF_ROLES, ...REQUESTER_ROLES];
const MIN_PASSWORD_LENGTH = 6;

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, username: row.username, role: row.role };
}

function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not signed in.' });
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session invalid.' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

const requireStaff = requireRole(...STAFF_ROLES);
const requireAdmin = requireRole('admin');

module.exports = {
  STAFF_ROLES, REQUESTER_ROLES, ALL_ROLES,
  MIN_PASSWORD_LENGTH, publicUser, validatePassword,
  requireAuth, requireRole, requireStaff, requireAdmin,
};
