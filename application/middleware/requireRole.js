const db = require('../db/connection');

/**
 * After requireAuth (or ensure session.userId). Loads role from DB.
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.session || req.session.userId == null) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    try {
      const [rows] = await db.getPool().query('SELECT role FROM Users WHERE user_id = ? LIMIT 1', [
        req.session.userId
      ]);
      if (!rows.length) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const role = rows[0].role || 'student';
      req.userRole = role;
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ success: false, error: 'This action requires elevated permissions.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

module.exports = { requireRole };
