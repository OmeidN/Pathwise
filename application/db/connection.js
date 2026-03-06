/**
 * MySQL connection pool for Pathwise backend.
 * Uses mysql2 with environment variables. Load dotenv in server.js before requiring this.
 */

const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'pathwise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (!config.user || !config.password) {
  console.error('[db] Missing DB_USER or DB_PASSWORD. Set them in .env.');
}

let pool = null;

/**
 * Get the shared connection pool. Creates it on first call.
 * @returns {mysql.Pool}
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

/**
 * Run a simple query to verify the database connection.
 * @returns {Promise<{ ok: boolean, message?: string, error?: string }>}
 */
async function testConnection() {
  const p = getPool();
  try {
    const [rows] = await p.query('SELECT 1 AS one');
    if (Array.isArray(rows) && rows[0] && rows[0].one === 1) {
      return { ok: true, message: 'Database connection OK' };
    }
    return { ok: false, message: 'Unexpected response from database' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Fetch rows from Resources for db-test endpoint (resource_id, title, LIMIT 5).
 * @returns {Promise<Array>}
 */
async function getResourcesSample() {
  const p = getPool();
  const [rows] = await p.query('SELECT resource_id, title FROM Resources LIMIT 5');
  return rows;
}

module.exports = {
  getPool,
  testConnection,
  getResourcesSample
};
