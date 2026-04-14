const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

function toDateRange(period) {
  const end = new Date();
  const start = new Date(end);
  if (period === 'month') start.setDate(end.getDate() - 30);
  else if (period === 'semester') start.setDate(end.getDate() - 120);
  else start.setDate(end.getDate() - 7);
  return { start, end };
}

router.get('/reports/summary', requireAuth, async (req, res) => {
  try {
    const period = String(req.query.period || 'week').toLowerCase();
    const { start, end } = toDateRange(period);
    const userId = req.session.userId;
    const pool = db.getPool();

    const [[goals]] = await pool.query(
      `SELECT COUNT(*) AS goals_completed
       FROM Goals
       WHERE user_id = ? AND status = 'completed' AND updated_at BETWEEN ? AND ?`,
      [userId, start, end]
    );

    const [[milestones]] = await pool.query(
      `SELECT COUNT(*) AS milestones_completed
       FROM Milestones m
       JOIN Projects p ON p.project_id = m.project_id
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE g.user_id = ? AND m.is_completed = 1 AND m.completed_at BETWEEN ? AND ?`,
      [userId, start, end]
    );

    const [[reflections]] = await pool.query(
      `SELECT COUNT(*) AS reflections_written
       FROM Reflections
       WHERE user_id = ? AND created_at BETWEEN ? AND ?`,
      [userId, start, end]
    );

    const [[bookmarks]] = await pool.query(
      `SELECT COUNT(*) AS bookmarks_added
       FROM Bookmarks
       WHERE user_id = ? AND created_at BETWEEN ? AND ?`,
      [userId, start, end]
    );

    const [activityRows] = await pool.query(
      `SELECT action_type, COUNT(*) AS total
       FROM ActivityLogs
       WHERE user_id = ? AND created_at BETWEEN ? AND ?
       GROUP BY action_type
       ORDER BY total DESC`,
      [userId, start, end]
    );

    res.json({
      success: true,
      period,
      range: { start, end },
      summary: {
        goals_completed: Number(goals.goals_completed) || 0,
        milestones_completed: Number(milestones.milestones_completed) || 0,
        reflections_written: Number(reflections.reflections_written) || 0,
        bookmarks_added: Number(bookmarks.bookmarks_added) || 0
      },
      activity: activityRows.map((r) => ({ action_type: r.action_type, total: Number(r.total) || 0 }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
