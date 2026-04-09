const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.post('/resources/:id/rating', requireAuth, async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    const stars = parseInt((req.body || {}).stars, 10);
    if (Number.isNaN(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid resource id' });
    }
    if (Number.isNaN(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, error: 'stars must be 1–5' });
    }
    const pool = db.getPool();
    const [exists] = await pool.query('SELECT resource_id FROM Resources WHERE resource_id = ? LIMIT 1', [
      resourceId
    ]);
    if (!exists.length) return res.status(404).json({ success: false, error: 'Resource not found' });

    await pool.query(
      `INSERT INTO ResourceRatings (user_id, resource_id, stars)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE stars = VALUES(stars), updated_at = CURRENT_TIMESTAMP`,
      [req.session.userId, resourceId, stars]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/resources/:id/ratings', async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id, 10);
    if (Number.isNaN(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid resource id' });
    }
    const [agg] = await db.getPool().query(
      `SELECT AVG(stars) AS avg_stars, COUNT(*) AS count FROM ResourceRatings WHERE resource_id = ?`,
      [resourceId]
    );
    const row = agg[0] || {};
    res.json({
      success: true,
      avg_stars: row.avg_stars != null ? Number(row.avg_stars) : null,
      count: row.count != null ? Number(row.count) : 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
