/**
 * Require an active session with userId (set by POST /api/login or POST /api/register).
 */
function requireAuth(req, res, next) {
  if (!req.session || req.session.userId == null) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  next();
}

module.exports = { requireAuth };
