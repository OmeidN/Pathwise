/**
 * Auth routes: register, login, logout, current user, my submissions.
 * Session cookie: frontend should use fetch(..., { credentials: 'include' }).
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
const BCRYPT_ROUNDS = 10;

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, error: 'email, username, and password are required' });
    }
    const em = String(email).trim().toLowerCase();
    const un = String(username).trim();
    const pw = String(password);

    if (!validateEmail(em)) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }
    if (un.length < 2 || un.length > 100) {
      return res.status(400).json({ success: false, error: 'Username must be 2–100 characters' });
    }
    if (pw.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const pool = db.getPool();
    const passwordHash = await bcrypt.hash(pw, BCRYPT_ROUNDS);

    const [result] = await pool.query(
      'INSERT INTO Users (email, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [em, un, passwordHash, 'student']
    );

    const userId = result.insertId;
    req.session.userId = userId;
    req.session.userRole = 'student';

    res.status(201).json({
      success: true,
      user: { user_id: userId, username: un, email: em, role: 'student' }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Email or username already registered' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required' });
    }
    const em = String(email).trim().toLowerCase();
    const pw = String(password);

    const pool = db.getPool();
    const [rows] = await pool.query(
      'SELECT user_id, email, username, password_hash, role FROM Users WHERE email = ? LIMIT 1',
      [em]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(pw, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    req.session.userId = user.user_id;
    req.session.userRole = user.role || 'student';
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role || 'student'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me/submissions', requireAuth, async (req, res) => {
  try {
    const pool = db.getPool();
    const [rows] = await pool.query(
      `SELECT resource_id, title, description, url, category_id, image_path, cost, visibility, created_at
       FROM Resources
       WHERE submitted_by = ?
       ORDER BY created_at DESC`,
      [req.session.userId]
    );
    res.json({ success: true, results: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    if (!req.session || req.session.userId == null) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const pool = db.getPool();
    const [rows] = await pool.query(
      'SELECT user_id, username, email, role, created_at FROM Users WHERE user_id = ? LIMIT 1',
      [req.session.userId]
    );

    if (!rows.length) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const u = rows[0];
    req.session.userRole = u.role || 'student';
    res.json({
      success: true,
      user: {
        user_id: u.user_id,
        username: u.username,
        email: u.email,
        role: u.role || 'student',
        created_at: u.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
