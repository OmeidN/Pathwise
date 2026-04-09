const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

/**
 * Browse-page recommendations:
 * 1) If user has current goals/projects, rank resources by text similarity.
 * 2) Otherwise return random unsaved resources.
 */
router.get('/recommendations', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 3, 24);
    const pool = db.getPool();
    const userId = req.session.userId;

    const [goalRows] = await pool.query(
      `SELECT title, description
       FROM Goals
       WHERE user_id = ? AND status IN ('active', 'paused')`,
      [userId]
    );

    const [projectRows] = await pool.query(
      `SELECT p.title, p.description
       FROM Projects p
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE g.user_id = ? AND g.status IN ('active', 'paused')`,
      [userId]
    );

    const sourceBlob = [...goalRows, ...projectRows]
      .flatMap((row) => [row.title, row.description])
      .filter(Boolean)
      .join(' ');

    const terms = sourceBlob
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length > 2)
      .slice(0, 16);

    // No current goals/projects content: return random unsaved resources.
    if (terms.length === 0) {
      const [fallback] = await pool.query(
        `SELECT resource_id, title, description, url, category_id, image_path, cost, is_ai_enabled
         FROM Resources r
         WHERE r.visibility = 'public'
           AND NOT EXISTS (
             SELECT 1
             FROM Bookmarks b
             WHERE b.user_id = ?
               AND b.resource_id = r.resource_id
           )
         ORDER BY RAND()
         LIMIT ?`,
        [userId, limit]
      );
      return res.json({ success: true, results: fallback, strategy: 'random_unsaved' });
    }

    const scoreParts = [];
    const scoreParams = [];
    for (const term of terms) {
      const like = `%${term}%`;
      scoreParts.push(
        `(CASE WHEN r.title LIKE ? THEN 3 ELSE 0 END + CASE WHEN r.description LIKE ? THEN 1 ELSE 0 END)`
      );
      scoreParams.push(like, like);
    }

    const scoreExpr = scoreParts.join(' + ');
    const sql = `SELECT
                   r.resource_id, r.title, r.description, r.url, r.category_id, r.image_path, r.cost, r.is_ai_enabled,
                   (${scoreExpr}) AS score
                 FROM Resources r
                 WHERE r.visibility = 'public'
                   AND NOT EXISTS (
                     SELECT 1
                     FROM Bookmarks b
                     WHERE b.user_id = ?
                       AND b.resource_id = r.resource_id
                   )
                 HAVING score > 0
                 ORDER BY score DESC, r.created_at DESC
                 LIMIT ?`;

    const [rows] = await pool.query(sql, [...scoreParams, userId, limit]);
    if (rows.length >= limit) {
      return res.json({ success: true, results: rows, strategy: 'goal_project_similarity' });
    }

    const existingIds = rows.map((r) => r.resource_id);
    const needed = limit - rows.length;
    const extraParams = [userId];
    let extraSql = `SELECT r.resource_id, r.title, r.description, r.url, r.category_id, r.image_path, r.cost, r.is_ai_enabled
                    FROM Resources r
                    WHERE r.visibility = 'public'
                      AND NOT EXISTS (
                        SELECT 1 FROM Bookmarks b WHERE b.user_id = ? AND b.resource_id = r.resource_id
                      )`;
    if (existingIds.length) {
      extraSql += ` AND r.resource_id NOT IN (${existingIds.map(() => '?').join(',')})`;
      extraParams.push(...existingIds);
    }
    extraSql += ' ORDER BY RAND() LIMIT ?';
    extraParams.push(needed);

    const [extras] = await pool.query(extraSql, extraParams);
    res.json({ success: true, results: [...rows, ...extras], strategy: 'goal_project_similarity_plus_fallback' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
