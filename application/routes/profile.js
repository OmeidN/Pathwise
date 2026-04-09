const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const pool = db.getPool();
    const [users] = await pool.query(
      'SELECT user_id, email, username, role, created_at FROM Users WHERE user_id = ? LIMIT 1',
      [req.session.userId]
    );
    if (!users.length) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const [profiles] = await pool.query(
      'SELECT interests, challenges, workload, aspirations, updated_at FROM UserProfiles WHERE user_id = ? LIMIT 1',
      [req.session.userId]
    );
    const profile = profiles[0] || {
      interests: null,
      challenges: null,
      workload: null,
      aspirations: null,
      updated_at: null
    };
    res.json({ success: true, user: users[0], profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { interests, challenges, workload, aspirations } = req.body || {};
    const pool = db.getPool();
    const wl = workload != null ? String(workload).trim().slice(0, 100) || null : null;
    await pool.query(
      `INSERT INTO UserProfiles (user_id, interests, challenges, workload, aspirations)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         interests = VALUES(interests),
         challenges = VALUES(challenges),
         workload = VALUES(workload),
         aspirations = VALUES(aspirations),
         updated_at = CURRENT_TIMESTAMP`,
      [
        req.session.userId,
        interests != null ? String(interests).trim() || null : null,
        challenges != null ? String(challenges).trim() || null : null,
        wl,
        aspirations != null ? String(aspirations).trim() || null : null
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
