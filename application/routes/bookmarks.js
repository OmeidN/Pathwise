/**
 * Saved resources for the logged-in user.
 * POST body: { resource_id, action?: 'add' | 'remove' } — default action is add.
 * Aliases: GET/POST /saved-resources (same handlers).
 */

const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

async function listSavedResources(req, res) {
  try {
    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT r.resource_id, r.title, r.description, r.url, r.category_id, r.image_path, r.cost,
              b.created_at AS bookmarked_at
       FROM Bookmarks b
       JOIN Resources r ON r.resource_id = b.resource_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.session.userId]
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function mutateSavedResource(req, res) {
  try {
    const { resource_id: ridRaw, action } = req.body || {};
    const resourceId = parseInt(ridRaw, 10);
    if (Number.isNaN(resourceId) || resourceId < 1) {
      return res.status(400).json({ success: false, error: 'resource_id is required' });
    }

    const act = action === 'remove' || action === 'unsave' || action === 'delete' ? 'remove' : 'add';

    const pool = db.getPool();
    const [exists] = await pool.query('SELECT resource_id FROM Resources WHERE resource_id = ? LIMIT 1', [
      resourceId
    ]);
    if (!exists.length) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    if (act === 'remove') {
      await pool.query('DELETE FROM Bookmarks WHERE user_id = ? AND resource_id = ?', [
        req.session.userId,
        resourceId
      ]);
      return res.json({ success: true, saved: false });
    }

    const [ins] = await pool.query('INSERT IGNORE INTO Bookmarks (user_id, resource_id) VALUES (?, ?)', [
      req.session.userId,
      resourceId
    ]);
    if (ins.affectedRows > 0) {
      await logActivity({
        userId: req.session.userId,
        actionType: 'resource_saved',
        entityType: 'resource',
        entityId: resourceId
      });
    }
    res.json({ success: true, saved: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

router.get('/bookmarks', requireAuth, listSavedResources);
router.post('/bookmarks', requireAuth, mutateSavedResource);
router.get('/saved-resources', requireAuth, listSavedResources);
router.post('/saved-resources', requireAuth, mutateSavedResource);

module.exports = router;
