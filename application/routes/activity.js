const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/activity', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const [rows] = await db.getPool().query(
      `SELECT log_id, action_type, entity_type, entity_id, detail, created_at
       FROM ActivityLogs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.session.userId, limit]
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
