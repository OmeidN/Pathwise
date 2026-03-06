/**
 * Pathwise backend - Express server with MySQL (RDS).
 * Load .env from the application directory (where server.js lives).
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const path = require('path');
const db = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Static files (HTML, CSS, etc.) from application directory
app.use(express.static(path.join(__dirname)));

// GET /api/db-test - simple DB test: run SELECT resource_id, title FROM Resources LIMIT 5
app.get('/api/db-test', async (req, res) => {
  try {
    const connectionTest = await db.testConnection();
    if (!connectionTest.ok) {
      return res.status(503).json({
        success: false,
        error: 'Database connection failed',
        details: connectionTest.error || connectionTest.message
      });
    }
    const sample = await db.getResourcesSample();
    res.json({
      success: true,
      database: connectionTest.message,
      resourcesSample: sample
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/search?q=...&category=... - keyword (LIKE) and category_id filter, parameterized
app.get('/api/search', async (req, res) => {
  try {
    const pool = db.getPool();
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();

    let sql = 'SELECT resource_id, title, description, url, category_id, image_path FROM Resources WHERE 1=1';
    const params = [];

    if (q) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term);
    }
    if (category) {
      sql += ' AND category_id = ?';
      params.push(category);
    }

    sql += ' ORDER BY title';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server and run startup DB check (errors logged, server does not crash)
app.listen(PORT, async () => {
  console.log(`Pathwise server listening on port ${PORT}`);

  try {
    const connectionTest = await db.testConnection();
    if (connectionTest.ok) {
      console.log('[startup]', connectionTest.message);
      const sample = await db.getResourcesSample();
      console.log('[startup] Resources table read OK, sample count:', sample.length);
    } else {
      console.error('[startup] Database connection failed:', connectionTest.error || connectionTest.message);
    }
  } catch (e) {
    console.error('[startup] Could not read Resources:', e.message);
  }
});
