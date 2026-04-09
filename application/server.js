require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db/connection');

const authRoutes = require('./routes/auth');
const bookmarkRoutes = require('./routes/bookmarks');
const resourceRoutes = require('./routes/resources');
const goalsRoutes = require('./routes/goals');
const projectsRoutes = require('./routes/projects');
const milestonesRoutes = require('./routes/milestones');
const dashboardRoutes = require('./routes/dashboard');
const profileRoutes = require('./routes/profile');
const reflectionsRoutes = require('./routes/reflections');
const activityRoutes = require('./routes/activity');
const messagesRoutes = require('./routes/messages');
const recommendationsRoutes = require('./routes/recommendations');
const ratingsRoutes = require('./routes/ratings');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 16) {
  console.warn('[session] SESSION_SECRET missing or short; set a long random value in .env for production.');
}

app.use(
  session({
    secret: sessionSecret || 'pathwise-dev-only-not-for-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.COOKIE_SECURE === 'true'
    }
  })
);

// API routes (before static so /api/* is never treated as a static file)
app.use('/api', authRoutes);
app.use('/api', bookmarkRoutes);
app.use('/api', resourceRoutes);
app.use('/api', goalsRoutes);
app.use('/api', projectsRoutes);
app.use('/api', milestonesRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', profileRoutes);
app.use('/api', reflectionsRoutes);
app.use('/api', activityRoutes);
app.use('/api', messagesRoutes);
app.use('/api', recommendationsRoutes);
app.use('/api', ratingsRoutes);
app.use('/api', usersRoutes);

// GET /api/db-test - simple DB test
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
    res.json({ success: true, database: connectionTest.message, resourcesSample: sample });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/search?q=...&category=...&tags=1,2&cost=free|paid
app.get('/api/search', async (req, res) => {
  try {
    const pool = db.getPool();
    const q        = (req.query.q        || '').trim();
    const category = (req.query.category || '').trim();
    const tagsParam = (req.query.tags || '').trim();
    const cost = (req.query.cost || '').trim();
    const aiRaw = (req.query.ai ?? req.query.is_ai_enabled ?? '').toString().trim().toLowerCase();
    const aiOnly = aiRaw === '1' || aiRaw === 'true' || aiRaw === 'yes';

    let sql = `SELECT resource_id, title, description, url, category_id, image_path, cost, is_ai_enabled
               FROM Resources r
               WHERE 1=1`;
    const params = [];

    if (q && !/^[a-z0-9 ]{1,40}$/i.test(q)) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be 1-40 characters and use only letters, numbers, and spaces'
      });
    }

    if (q) {
      sql += ' AND (r.title LIKE ? OR r.description LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term);
    }
    if (category) {
      sql += ' AND r.category_id = ?';
      params.push(category);
    }

    if (tagsParam) {
      const rawTags = tagsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const tagIds = rawTags
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n) && n > 0);

      const tagSlugs = rawTags
        .filter((s) => Number.isNaN(parseInt(s, 10)))
        .map((s) => s.toLowerCase());

      if (tagIds.length > 0 || tagSlugs.length > 0) {
        const tagFilters = [];

        if (tagIds.length > 0) {
          tagFilters.push(`tag_id IN (${tagIds.map(() => '?').join(',')})`);
          params.push(...tagIds);
        }

        if (tagSlugs.length > 0) {
          tagFilters.push(
            `LOWER(REPLACE(tag_name, ' ', '-')) IN (${tagSlugs.map(() => '?').join(',')})`
          );
          params.push(...tagSlugs);
        }

        sql += ` AND r.resource_id IN (
          SELECT resource_id
          FROM ResourceTags
          WHERE tag_id IN (
            SELECT tag_id
            FROM Tags
            WHERE ${tagFilters.join(' OR ')}
          )
        )`;
      }
    }

    if (cost && cost !== 'all') {
      sql += ' AND r.cost = ?';
      params.push(cost);
    }

    if (aiOnly) {
      sql += ' AND r.is_ai_enabled = 1';
    }

    sql += ' ORDER BY r.title';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Static files (HTML, CSS, etc.) from application directory
app.use(express.static(path.join(__dirname)));

// Start server and run startup DB check (errors logged, server does not crash)
app.listen(PORT, async () => {
  console.log(`Pathwise server listening on port ${PORT}`);

  try {
    const connectionTest = await db.testConnection();
    if (connectionTest.ok) {
      console.log('[startup]', connectionTest.message);
      const sample = await db.getResourcesSample();
      console.log('[startup] Resources sample count:', sample.length);
    } else {
      console.error('[startup] DB connection failed:', connectionTest.error || connectionTest.message);
    }
  } catch (e) {
    console.error('[startup] Could not read Resources:', e.message);
  }
});
