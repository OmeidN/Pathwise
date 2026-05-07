/**
 * Why:
 *   This file is needed so students can record their reflective planning in a journal
 *   style notes that can also connect to their goals, projects and milestone.
 *
 * What:
 *   It defines the essential routes that deal with listing all the previous reflections,
 *   creating new ones, and deleting them. As well as allowing users to connect them to
 *   their goals.
 *
 * Where used:
 *   It is mounted under '/api/ in server.js
 *   It is called by vertical-prototype/js/reflections.js
 *
 * Notes:
 *   - It expects an authenticated session
 *   - The table it touches: 
 *        Reflections, 
 *        Goals, 
 *        Projects.
 *        Milestones,
 *        ReflectionGoals,
 *        ReflectionProjects,
 *        ReflectionMilestones.
 *   - It validates the goal/project attributed to the reflection belongs to the user
 *     themselves
 *   - Log activity occurs here when a new reflection is made
 * 
 * TODO:
 *   - The interface that enables the user to choose which goals or projects to link each
 *     of their reflection is based on id they have to input, but it should list out all 
 *     their goals and projects so its easy for them to link it
 *   - Also add a way to link to their milestone as well in addition to their goals and 
 *     projects
 */

const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// ------------------------------
function parseIdArray(value) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

async function getOwnedGoalIds(pool, userId, goalIds) {
  if (goalIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT goal_id
     FROM Goals
     WHERE user_id = ?
       AND goal_id IN (${goalIds.map(() => '?').join(',')})`,
    [userId, ...goalIds]
  );

  return rows.map((row) => row.goal_id);
}

async function getOwnedProjectIds(pool, userId, projectIds) {
  if (projectIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT p.project_id
     FROM Projects p
     JOIN Goals g ON g.goal_id = p.goal_id
     WHERE g.user_id = ?
       AND p.project_id IN (${projectIds.map(() => '?').join(',')})`,
    [userId, ...projectIds]
  );

  return rows.map((row) => row.project_id);
}

async function getOwnedMilestoneIds(pool, userId, milestoneIds) {
  if (milestoneIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT m.milestone_id
     FROM Milestones m
     JOIN Projects p ON p.project_id = m.project_id
     JOIN Goals g ON g.goal_id = p.goal_id
     WHERE g.user_id = ?
       AND m.milestone_id IN (${milestoneIds.map(() => '?').join(',')})`,
    [userId, ...milestoneIds]
  );

  return rows.map((row) => row.milestone_id);
}

function ownsAllRequestedIds(requested, owned) {
  if (requested.length !== owned.length) return false;
  const ownedSet = new Set(owned);
  return requested.every((id) => ownedSet.has(id));
}

async function insertReflectionLinks(conn, reflectionId, goalIds, projectIds, milestoneIds) {
  for (const goalId of goalIds) {
    await conn.query(
      `INSERT IGNORE INTO ReflectionGoals (reflection_id, goal_id)
       VALUES (?, ?)`,
      [reflectionId, goalId]
    );
  }

  for (const projectId of projectIds) {
    await conn.query(
      `INSERT IGNORE INTO ReflectionProjects (reflection_id, project_id)
       VALUES (?, ?)`,
      [reflectionId, projectId]
    );
  }

  for (const milestoneId of milestoneIds) {
    await conn.query(
      `INSERT IGNORE INTO ReflectionMilestones (reflection_id, milestone_id)
       VALUES (?, ?)`,
      [reflectionId, milestoneId]
    );
  }
}
// ------------------------------

async function assertGoalOwned(pool, userId, goalId) {
  if (!goalId) return true;
  const [g] = await pool.query('SELECT goal_id FROM Goals WHERE goal_id = ? AND user_id = ?', [
    goalId,
    userId
  ]);
  return g.length > 0;
}

async function assertProjectOwned(pool, userId, projectId) {
  if (!projectId) return true;
  const [p] = await pool.query(
    `SELECT p.project_id FROM Projects p
     JOIN Goals g ON g.goal_id = p.goal_id
     WHERE p.project_id = ? AND g.user_id = ?`,
    [projectId, userId]
  );
  return p.length > 0;
}

router.get('/reflections', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.getPool().query(
      `SELECT reflection_id, user_id, body, goal_id, project_id, created_at, updated_at
       FROM Reflections
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.session.userId]
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reflections', requireAuth, async (req, res) => {
  try {
    const { body, goal_id: gid, project_id: pid } = req.body || {};
    const text = body != null ? String(body).trim() : '';
    if (text.length < 1) {
      return res.status(400).json({ success: false, error: 'body is required' });
    }
    const goalId = gid != null && gid !== '' ? Number(gid) : null;
    const projectId = pid != null && pid !== '' ? Number(pid) : null;
    if (goalId && Number.isNaN(goalId)) {
      return res.status(400).json({ success: false, error: 'Invalid goal_id' });
    }
    if (projectId && Number.isNaN(projectId)) {
      return res.status(400).json({ success: false, error: 'Invalid project_id' });
    }

    const pool = db.getPool();
    if (!(await assertGoalOwned(pool, req.session.userId, goalId))) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    if (!(await assertProjectOwned(pool, req.session.userId, projectId))) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO Reflections (user_id, body, goal_id, project_id) VALUES (?, ?, ?, ?)`,
      [req.session.userId, text, goalId, projectId]
    );
    const reflectionId = result.insertId;
    await logActivity({
      userId: req.session.userId,
      actionType: 'reflection_created',
      entityType: 'reflection',
      entityId: reflectionId
    });
    res.status(201).json({ success: true, reflection_id: reflectionId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/reflections/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { body, goal_id: gid, project_id: pid } = req.body || {};
    const text = body != null ? String(body).trim() : '';
    if (!id || text.length < 1) {
      return res.status(400).json({ success: false, error: 'Invalid reflection or empty body' });
    }
    const goalId = gid != null && gid !== '' ? Number(gid) : null;
    const projectId = pid != null && pid !== '' ? Number(pid) : null;

    const pool = db.getPool();
    if (!(await assertGoalOwned(pool, req.session.userId, goalId))) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    if (!(await assertProjectOwned(pool, req.session.userId, projectId))) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const [result] = await pool.query(
      `UPDATE Reflections SET body = ?, goal_id = ?, project_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE reflection_id = ? AND user_id = ?`,
      [text, goalId, projectId, id, req.session.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Reflection not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/reflections/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' });
    const [result] = await db.getPool().query(
      'DELETE FROM Reflections WHERE reflection_id = ? AND user_id = ?',
      [id, req.session.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Reflection not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
