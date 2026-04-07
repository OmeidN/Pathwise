const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const pool = db.getPool();
    const userId = req.session.userId;

    const [goals] = await pool.query(
      `SELECT goal_id, title, description, category, target_date, status, updated_at
       FROM Goals WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId]
    );
    const [projects] = await pool.query(
      `SELECT p.project_id, p.goal_id, p.title, p.description, p.updated_at
       FROM Projects p
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE g.user_id = ?
       ORDER BY p.updated_at DESC`,
      [userId]
    );
    const [milestones] = await pool.query(
      `SELECT m.milestone_id, m.project_id, m.title, m.target_date, m.is_completed, m.updated_at
       FROM Milestones m
       JOIN Projects p ON p.project_id = m.project_id
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE g.user_id = ?
       ORDER BY m.target_date IS NULL, m.target_date ASC`,
      [userId]
    );
    const [savedResources] = await pool.query(
      `SELECT r.resource_id, r.title, r.description, r.url, r.cost, b.created_at AS bookmarked_at
       FROM Bookmarks b
       JOIN Resources r ON r.resource_id = b.resource_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json({ success: true, goals, projects, milestones, savedResources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
