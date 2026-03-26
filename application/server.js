require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const path    = require('path');
const db      = require('./db/connection');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'pathwise-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// serve landing page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'vertical-prototype', 'landing.html'));
});

app.use(express.static(path.join(__dirname)));

// POST /api/register — creates a new user
// expects: { username, email, password }
// assumes Users table: user_id, username, email, password_hash
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }

    const pool = db.getPool();

    const [existing] = await pool.query('SELECT user_id FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/login — verifies credentials and sets session
// expects: { email, password }
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const pool = db.getPool();
    const [rows] = await pool.query(
      'SELECT user_id, username, email, password_hash FROM Users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    req.session.user = { id: user.user_id, username: user.username, email: user.email };
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/me — returns logged-in user or 401
app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }
  res.json({ success: true, user: req.session.user });
});

// POST /api/logout — destroys session
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/db-test — verifies DB connection and returns a sample
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

// GET /api/search?q=...&category=... — keyword and category filter
app.get('/api/search', async (req, res) => {
  try {
    const pool = db.getPool();
    const q        = (req.query.q        || '').trim();
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
