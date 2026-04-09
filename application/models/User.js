const db = require('../db/connection');

async function findById(userId) {
  const [rows] = await db.getPool().query(
    'SELECT user_id, email, username, role, created_at FROM Users WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

module.exports = { findById };
