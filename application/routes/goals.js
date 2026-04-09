const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

function validStatus(value) {
  return ['active', 'paused', 'completed'].includes(value);
}

router.get('/goals-overview', requireAuth, async (req, res) => {
  try {
    const pool = db.getPool();
    const userId = req.session.userId;
    const [goals] = await pool.query(
      `SELECT goal_id, user_id, title, description, category, target_date, status, created_at, updated_at
       FROM Goals
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId]
    );

    const [projectCounts] = await pool.query(
      `SELECT g.goal_id, COUNT(p.project_id) AS project_count
       FROM Goals g
       LEFT JOIN Projects p ON p.goal_id = g.goal_id
       WHERE g.user_id = ?
       GROUP BY g.goal_id`,
      [userId]
    );

    const [milestoneCounts] = await pool.query(
      `SELECT g.goal_id,
              COUNT(m.milestone_id) AS milestone_total,
              SUM(CASE WHEN m.is_completed = 1 THEN 1 ELSE 0 END) AS milestone_done
       FROM Goals g
       LEFT JOIN Projects p ON p.goal_id = g.goal_id
       LEFT JOIN Milestones m ON m.project_id = p.project_id
       WHERE g.user_id = ?
       GROUP BY g.goal_id`,
      [userId]
    );

    const projectMap = new Map(projectCounts.map((r) => [r.goal_id, Number(r.project_count) || 0]));
    const milestoneMap = new Map(
      milestoneCounts.map((r) => [
        r.goal_id,
        {
          total: Number(r.milestone_total) || 0,
          done: Number(r.milestone_done) || 0
        }
      ])
    );

    const results = goals.map((g) => {
      const m = milestoneMap.get(g.goal_id) || { total: 0, done: 0 };
      const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
      return {
        ...g,
        project_count: projectMap.get(g.goal_id) || 0,
        milestone_total: m.total,
        milestone_done: m.done,
        completion_pct: pct
      };
    });

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

router.get('/goals/:id', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    if (!goalId) return res.status(400).json({ success: false, error: 'Invalid goal id' });
    const [rows] = await db.getPool().query(
      `SELECT goal_id, user_id, title, description, category, target_date, status, created_at, updated_at
       FROM Goals
       WHERE goal_id = ? AND user_id = ?
       LIMIT 1`,
      [goalId, req.session.userId]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Goal not found' });
    res.json({ success: true, goal: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/goals/:id/hub', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    if (!goalId) return res.status(400).json({ success: false, error: 'Invalid goal id' });
    const userId = req.session.userId;
    const pool = db.getPool();

    const [goalRows] = await pool.query(
      `SELECT goal_id, user_id, title, description, category, target_date, status, created_at, updated_at
       FROM Goals
       WHERE goal_id = ? AND user_id = ?
       LIMIT 1`,
      [goalId, userId]
    );
    if (!goalRows.length) return res.status(404).json({ success: false, error: 'Goal not found' });

    const goal = goalRows[0];
    const [projects] = await pool.query(
      `SELECT p.project_id, p.goal_id, p.title, p.description, p.created_at, p.updated_at
       FROM Projects p
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE p.goal_id = ? AND g.user_id = ?
       ORDER BY p.updated_at DESC`,
      [goalId, userId]
    );

    const projectIds = projects.map((p) => p.project_id);
    let milestones = [];
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT milestone_id, project_id, title, description, target_date, is_completed, completed_at, created_at, updated_at
         FROM Milestones
         WHERE project_id IN (${placeholders})
         ORDER BY target_date IS NULL, target_date ASC, created_at ASC`,
        projectIds
      );
      milestones = rows;
    }

    const milestoneByProject = new Map();
    for (const m of milestones) {
      const arr = milestoneByProject.get(m.project_id) || [];
      arr.push(m);
      milestoneByProject.set(m.project_id, arr);
    }

    const projectsWithMilestones = projects.map((p) => {
      const list = milestoneByProject.get(p.project_id) || [];
      const done = list.filter((m) => m.is_completed).length;
      const total = list.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        ...p,
        milestones: list,
        stats: { milestone_total: total, milestone_done: done, completion_pct: pct }
      };
    });

    const milestoneTotal = milestones.length;
    const milestoneDone = milestones.filter((m) => m.is_completed).length;
    const completionPct = milestoneTotal > 0 ? Math.round((milestoneDone / milestoneTotal) * 100) : 0;

    res.json({
      success: true,
      goal,
      projects: projectsWithMilestones,
      stats: {
        project_count: projects.length,
        milestone_total: milestoneTotal,
        milestone_done: milestoneDone,
        completion_pct: completionPct
      }
    });
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
    const goalId = result.insertId;
    await logActivity({
      userId: req.session.userId,
      actionType: 'goal_created',
      entityType: 'goal',
      entityId: goalId,
      detail: { title: String(title).trim() }
    });
    res.status(201).json({ success: true, goal_id: goalId });
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
