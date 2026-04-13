const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/goals/:goalId/projects', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.goalId);
    const [rows] = await db.getPool().query(
      `SELECT p.project_id, p.goal_id, p.title, p.description, p.created_at, p.updated_at
       FROM Projects p
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE p.goal_id = ? AND g.user_id = ?
       ORDER BY p.updated_at DESC`,
      [goalId, req.session.userId]
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/goals/:goalId/projects', requireAuth, async (req, res) => {
  try {
    const goalId = Number(req.params.goalId);
    const { title, description } = req.body || {};
    if (!goalId || !title) return res.status(400).json({ success: false, error: 'goalId and title required' });
    const [goals] = await db.getPool().query('SELECT goal_id FROM Goals WHERE goal_id = ? AND user_id = ?', [
      goalId,
      req.session.userId
    ]);
    if (!goals.length) return res.status(404).json({ success: false, error: 'Goal not found' });
    const [result] = await db.getPool().query(
      'INSERT INTO Projects (goal_id, title, description) VALUES (?, ?, ?)',
      [goalId, String(title).trim(), description || null]
    );
    res.status(201).json({ success: true, project_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/projects/:id', requireAuth, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { title, description } = req.body || {};
    if (!projectId || !title) return res.status(400).json({ success: false, error: 'projectId and title required' });
    const [result] = await db.getPool().query(
      `UPDATE Projects p
       JOIN Goals g ON g.goal_id = p.goal_id
       SET p.title = ?, p.description = ?, p.updated_at = CURRENT_TIMESTAMP
       WHERE p.project_id = ? AND g.user_id = ?`,
      [String(title).trim(), description || null, projectId, req.session.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ success: false, error: 'Invalid project id' });
    const [result] = await db.getPool().query(
      `DELETE p FROM Projects p
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE p.project_id = ? AND g.user_id = ?`,
      [projectId, req.session.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/projects/:id/resources', requireAuth, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const resourceId = Number((req.body || {}).resource_id);

    if (!projectId || !resourceId) {
      return res.status(400).json(
        { 
          success: false, 
          error: 'project id and resource_id required' 
        }
      );
    }

    // We should not tru the posted resource_id outright but to check it first
    const [resources] = await db.getPool().query(
      'SELECT resource_id FROM Resources WHERE resource_id = ? LIMIT 1',
      [resourceId]
    );

    if (!resources.length) {
      return res.status(404).json(
        { 
          success: false, 
          error: 'Resource not found' 
        }
      );
    }

    const [projects] = await db.getPool().query(
      `SELECT p.project_id
       FROM Projects p JOIN Goals g ON g.goal_id = p.goal_id
       WHERE p.project_id = ? AND g.user_id = ?`,
      [projectId, req.session.userId]
    );

    if (!projects.length) {
      return res.status(404).json(
        { 
          success: false, 
          error: 'Project not found' 
        }
      );
    }

    await db.getPool().query('INSERT IGNORE INTO ProjectResources (project_id, resource_id) VALUES (?, ?)', [projectId, resourceId]);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
