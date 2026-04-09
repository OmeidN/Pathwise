const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

function tokenize(values, max = 12) {
  const terms = new Set();
  for (const value of values) {
    if (!value) continue;
    const tokens = String(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length > 2);
    for (const t of tokens) {
      terms.add(t);
      if (terms.size >= max) return Array.from(terms);
    }
  }
  return Array.from(terms);
}

function buildScoreParts({ goalTitleTerms, goalDescTerms, projectTitleTerms, projectDescTerms }) {
  const weightedGroups = [
    { terms: goalTitleTerms, titleWeight: 2000, descWeight: 1000 },
    { terms: goalDescTerms, titleWeight: 200, descWeight: 100 },
    { terms: projectTitleTerms, titleWeight: 20, descWeight: 10 },
    { terms: projectDescTerms, titleWeight: 2, descWeight: 1 }
  ];

  const scoreParts = [];
  const scoreParams = [];
  for (const group of weightedGroups) {
    for (const term of group.terms) {
      const like = `%${term}%`;
      scoreParts.push(
        `(CASE WHEN r.title LIKE ? THEN ${group.titleWeight} ELSE 0 END + CASE WHEN r.description LIKE ? THEN ${group.descWeight} ELSE 0 END)`
      );
      scoreParams.push(like, like);
    }
  }
  return { scoreParts, scoreParams };
}

/**
 * Browse-page recommendations:
 * 1) If user has current goals/projects, rank resources by text similarity.
 * 2) Otherwise return random unsaved resources.
 */
router.get('/recommendations', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 24);
    const pool = db.getPool();
    const userId = req.session.userId;

    const [goalRows] = await pool.query(
      `SELECT goal_id, title, description
       FROM Goals
       WHERE user_id = ? AND status IN ('active', 'paused')
       ORDER BY updated_at DESC`,
      [userId]
    );

    const [projectRows] = await pool.query(
      `SELECT p.goal_id, p.title, p.description
       FROM Projects p
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE g.user_id = ? AND g.status IN ('active', 'paused')`,
      [userId]
    );

    // No current goals/projects: return random unsaved resources.
    if (goalRows.length === 0 && projectRows.length === 0) {
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

    const projectsByGoal = new Map();
    for (const p of projectRows) {
      const list = projectsByGoal.get(p.goal_id) || [];
      list.push(p);
      projectsByGoal.set(p.goal_id, list);
    }

    const selected = [];
    const selectedIds = new Set();
    const goalsToEvaluate = goalRows.slice(0, limit);

    for (const goal of goalsToEvaluate) {
      if (selected.length >= limit) break;
      const relatedProjects = projectsByGoal.get(goal.goal_id) || [];

      const goalTitleTerms = tokenize([goal.title], 14);
      const goalDescTerms = tokenize([goal.description], 12);
      const projectTitleTerms = tokenize(relatedProjects.map((p) => p.title), 10);
      const projectDescTerms = tokenize(relatedProjects.map((p) => p.description), 8);

      const { scoreParts, scoreParams } = buildScoreParts({
        goalTitleTerms,
        goalDescTerms,
        projectTitleTerms,
        projectDescTerms
      });

      if (scoreParts.length === 0) continue;

      const scoreExpr = scoreParts.join(' + ');
      const params = [...scoreParams];
      let sql = `SELECT
                   r.resource_id, r.title, r.description, r.url, r.category_id, r.image_path, r.cost, r.is_ai_enabled,
                   (${scoreExpr}) AS score
                 FROM Resources r
                 WHERE r.visibility = 'public'`;

      if (selectedIds.size > 0) {
        sql += ` AND r.resource_id NOT IN (${Array.from(selectedIds).map(() => '?').join(',')})`;
        params.push(...Array.from(selectedIds));
      }

      sql += ` HAVING score > 0
               ORDER BY score DESC
               LIMIT 12`;

      const [candidates] = await pool.query(sql, params);
      if (!candidates.length) continue;

      const maxScore = candidates[0].score;
      const best = candidates.filter((c) => c.score === maxScore);
      const pick = best[Math.floor(Math.random() * best.length)];

      selected.push(pick);
      selectedIds.add(pick.resource_id);
    }

    if (selected.length < limit) {
      const needed = limit - selected.length;
      const params = [userId];
      let sql = `SELECT r.resource_id, r.title, r.description, r.url, r.category_id, r.image_path, r.cost, r.is_ai_enabled
                 FROM Resources r
                 WHERE r.visibility = 'public'
                   AND NOT EXISTS (
                     SELECT 1
                     FROM Bookmarks b
                     WHERE b.user_id = ?
                       AND b.resource_id = r.resource_id
                   )`;

      if (selectedIds.size > 0) {
        sql += ` AND r.resource_id NOT IN (${Array.from(selectedIds).map(() => '?').join(',')})`;
        params.push(...Array.from(selectedIds));
      }
      sql += ' ORDER BY RAND() LIMIT ?';
      params.push(needed);

      const [extras] = await pool.query(sql, params);
      for (const row of extras) {
        selected.push(row);
        selectedIds.add(row.resource_id);
      }
    }

    res.json({ success: true, results: selected, strategy: 'goal_per_slot_plus_random_fill' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
