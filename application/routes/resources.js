/**
 * Single resource fetch, create (submit), faculty AI flag, optional image upload.
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

const uploadDir = path.join(__dirname, '../public/uploads');
const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `res-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }
});

function uploadOptional(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
    next();
  });
}

async function resolveTagIds(conn, tagValuesRaw) {
  if (tagValuesRaw == null) {
    return [];
  }
  if (typeof tagValuesRaw === 'string') {
    const t = tagValuesRaw.trim();
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          return resolveTagIds(conn, parsed);
        }
      } catch (_) {
        /* continue with comma split */
      }
    }
  }

  const rawValues = Array.isArray(tagValuesRaw)
    ? tagValuesRaw
    : typeof tagValuesRaw === 'string'
      ? tagValuesRaw.split(',')
      : [];

  const cleaned = rawValues.map((value) => String(value).trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return [];
  }

  const numericIds = cleaned
    .map((value) => parseInt(value, 10))
    .filter((value) => !Number.isNaN(value) && value > 0);

  const tagSlugs = cleaned
    .filter((value) => Number.isNaN(parseInt(value, 10)))
    .map((value) => value.toLowerCase());

  const resolvedIds = new Set();

  if (numericIds.length > 0) {
    const [existingById] = await conn.query(
      `SELECT tag_id FROM Tags WHERE tag_id IN (${numericIds.map(() => '?').join(',')})`,
      numericIds
    );
    existingById.forEach((row) => resolvedIds.add(row.tag_id));
  }

  if (tagSlugs.length > 0) {
    const [existingBySlug] = await conn.query(
      `SELECT tag_id
       FROM Tags
       WHERE LOWER(REPLACE(tag_name, ' ', '-')) IN (${tagSlugs.map(() => '?').join(',')})`,
      tagSlugs
    );
    existingBySlug.forEach((row) => resolvedIds.add(row.tag_id));
  }

  return Array.from(resolvedIds);
}

router.patch('/resources/:id/ai-meta', requireAuth, requireRole('faculty', 'staff'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid resource id' });
    }
    const enabled = Boolean((req.body || {}).is_ai_enabled);
    const [result] = await db.getPool().query(
      'UPDATE Resources SET is_ai_enabled = ? WHERE resource_id = ?',
      [enabled ? 1 : 0, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Resource not found' });
    res.json({ success: true, is_ai_enabled: enabled ? 1 : 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/resources/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid resource id' });
    }

    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT r.resource_id, r.title, r.description, r.url, r.image_path, r.category_id,
              r.submitted_by, r.cost, r.is_ai_enabled, r.visibility, r.created_at,
              c.category_name
       FROM Resources r
       LEFT JOIN Categories c ON c.category_id = r.category_id
       WHERE r.resource_id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const resource = rows[0];
    const [tagRows] = await pool.query(
      `SELECT t.tag_id, t.tag_name
       FROM ResourceTags rt
       JOIN Tags t ON t.tag_id = rt.tag_id
       WHERE rt.resource_id = ?
       ORDER BY t.tag_name`,
      [id]
    );

    resource.tags = tagRows;

    const [[ratingAgg]] = await pool.query(
      `SELECT AVG(stars) AS avg_stars, COUNT(*) AS rating_count FROM ResourceRatings WHERE resource_id = ?`,
      [id]
    );
    resource.avg_rating =
      ratingAgg && ratingAgg.avg_stars != null ? Number(ratingAgg.avg_stars) : null;
    resource.rating_count =
      ratingAgg && ratingAgg.rating_count != null ? Number(ratingAgg.rating_count) : 0;

    res.json({ success: true, resource });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/resources', requireAuth, uploadOptional, async (req, res) => {
  const {
    title,
    description,
    url,
    category_id: categoryIdRaw,
    cost,
    tags: tagIdsRaw,
    visibility: visRaw
  } = req.body || {};

  if (!title || !description || categoryIdRaw === undefined || categoryIdRaw === null || categoryIdRaw === '') {
    return res.status(400).json({
      success: false,
      error: 'title, description, and category_id are required'
    });
  }

  const categoryId = parseInt(categoryIdRaw, 10);
  if (Number.isNaN(categoryId)) {
    return res.status(400).json({ success: false, error: 'Invalid category_id' });
  }

  const titleStr = String(title).trim();
  const descStr = String(description).trim();
  const urlStr = url != null && String(url).trim() !== '' ? String(url).trim() : null;
  const costStr = cost != null && String(cost).trim() !== '' ? String(cost).trim().slice(0, 32) : null;
  const visibility = visRaw === 'private' ? 'private' : 'public';

  let imagePath = null;
  if (req.file && req.file.filename) {
    imagePath = `/public/uploads/${req.file.filename}`;
  }

  if (titleStr.length < 1 || titleStr.length > 255) {
    return res.status(400).json({ success: false, error: 'Invalid title' });
  }

  const conn = await db.getPool().getConnection();
  try {
    const tagIds = await resolveTagIds(conn, tagIdsRaw);

    const [catCheck] = await conn.query('SELECT category_id FROM Categories WHERE category_id = ? LIMIT 1', [
      categoryId
    ]);
    if (!catCheck.length) {
      return res.status(400).json({ success: false, error: 'Invalid category_id' });
    }

    await conn.beginTransaction();

    const [insertResult] = await conn.query(
      `INSERT INTO Resources
        (title, description, url, image_path, category_id, submitted_by, cost, is_ai_enabled, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [titleStr, descStr, urlStr, imagePath, categoryId, req.session.userId, costStr, visibility]
    );

    const resourceId = insertResult.insertId;

    for (const tid of tagIds) {
      await conn.query('INSERT INTO ResourceTags (resource_id, tag_id) VALUES (?, ?)', [resourceId, tid]);
    }

    await conn.commit();

    const [created] = await conn.query(
      `SELECT r.resource_id, r.title, r.description, r.url, r.image_path, r.category_id,
              r.submitted_by, r.cost, r.is_ai_enabled, r.visibility, r.created_at, c.category_name
       FROM Resources r
       LEFT JOIN Categories c ON c.category_id = r.category_id
       WHERE r.resource_id = ?`,
      [resourceId]
    );

    const resource = created[0];
    const [tagRows] = await conn.query(
      `SELECT t.tag_id, t.tag_name FROM ResourceTags rt
       JOIN Tags t ON t.tag_id = rt.tag_id WHERE rt.resource_id = ?`,
      [resourceId]
    );
    resource.tags = tagRows;
    resource.avg_rating = null;
    resource.rating_count = 0;

    res.status(201).json({ success: true, resource });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
