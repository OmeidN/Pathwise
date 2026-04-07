const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

function validStatus(value) {
  return ['active', 'paused', 'completed'].includes(value);
}

router.get('/goals', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.getPool().query(
      `SELECT goal_id, user_id, title, description, category, target_date, status, created_at, updated_at
       FROM Goals
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [req.session.userId]
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/goals', requireAuth, async (req, res) => {
  try {
    const { title, description, category, target_date } = req.body || {};
    if (!title || String(title).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'title is required (min 2 chars)' });
    }
    const [result] = await db.getPool().query(
      `INSERT INTO Goals (user_id, title, description, category, target_date, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [req.session.userId, String(title).trim(), description || null, category || null, target_date || null]
    );
    res.status(201).json({ success: true, goal_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/goals/:id', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    const { title, description, category, target_date } = req.body || {};
    if (!goalId) return res.status(400).json({ success: false, error: 'Invalid goal id' });
    if (!title || String(title).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'title is required (min 2 chars)' });
    }
    const [result] = await db.getPool().query(
      `UPDATE Goals
       SET title = ?, description = ?, category = ?, target_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE goal_id = ? AND user_id = ?`,
      [String(title).trim(), description || null, category || null, target_date || null, goalId, req.session.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Goal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/goals/:id/status', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    const { status } = req.body || {};
    if (!goalId) return res.status(400).json({ success: false, error: 'Invalid goal id' });
    if (!validStatus(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
    const [result] = await db.getPool().query(
      `UPDATE Goals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE goal_id = ? AND user_id = ?`,
      [status, goalId, req.session.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Goal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/goals/:id', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    if (!goalId) return res.status(400).json({ success: false, error: 'Invalid goal id' });
    const [result] = await db.getPool().query('DELETE FROM Goals WHERE goal_id = ? AND user_id = ?', [
      goalId,
      req.session.userId
    ]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Goal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/goals/:id/resources', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    const resourceId = Number((req.body || {}).resource_id);
    if (!goalId || !resourceId) return res.status(400).json({ success: false, error: 'goal id and resource_id required' });

    const [goals] = await db.getPool().query('SELECT goal_id FROM Goals WHERE goal_id = ? AND user_id = ?', [
      goalId,
      req.session.userId
    ]);
    if (!goals.length) return res.status(404).json({ success: false, error: 'Goal not found' });

    await db.getPool().query('INSERT IGNORE INTO GoalResources (goal_id, resource_id) VALUES (?, ?)', [goalId, resourceId]);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
