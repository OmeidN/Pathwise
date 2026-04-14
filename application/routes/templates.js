const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.get('/templates/public', async (req, res) => {
  try {
    const [rows] = await db.getPool().query(
      `SELECT t.template_id, t.title, t.description, t.category, t.workflow_steps, t.created_at,
              u.username AS author
       FROM CommunityTemplates t
       LEFT JOIN Users u ON u.user_id = t.created_by
       WHERE t.is_public = 1
       ORDER BY t.created_at DESC`
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/templates', requireAuth, async (req, res) => {
  try {
    const { title, description, category, workflow_steps } = req.body || {};
    const titleStr = String(title || '').trim();
    const stepsStr = String(workflow_steps || '').trim();
    const descStr = String(description || '').trim();
    const catStr = String(category || '').trim().toLowerCase();

    if (titleStr.length < 3 || titleStr.length > 255) {
      return res.status(400).json({ success: false, error: 'Title must be between 3 and 255 characters.' });
    }
    if (stepsStr.length < 10) {
      return res.status(400).json({ success: false, error: 'Workflow steps must be at least 10 characters.' });
    }

    const [result] = await db.getPool().query(
      `INSERT INTO CommunityTemplates (title, description, category, workflow_steps, is_public, created_by)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [titleStr, descStr || null, catStr || null, stepsStr, req.session.userId]
    );

    res.status(201).json({ success: true, template_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
