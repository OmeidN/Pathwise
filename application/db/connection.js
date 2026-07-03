/**
 * Why:
 *   This file is meant to create/share connection pool to the database that
 *   is used by the backend.
 *
 * What:
 *   This file exposes the helper functions to create/fetch the shared resources
 *   of the promise pool, test the database connection by sending small query,
 *   and other functions that retrieve small sample read for checking.
 *
 * Where used:
 *   This file is imported by the route files, controllers, the user models 
 *   and the services we have in our backend.
 *
 * Notes:
 *   - This file uses the env variables to know the credentials to the database
 *   - For the app, this should be the only database connection entry point
 *   - It is used by the '/api/db-test' and any of the startup connection checks
 *     we perform
 */

const mysql = require('mysql2/promise');

const host = process.env.DB_HOST || 'localhost';

const config = {
  host,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'pathwise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

function shouldUseSsl() {
  if (process.env.DB_SSL === 'true') return true;
  if (process.env.DB_SSL === 'false') return false;
  // TiDB public endpoints reject non-TLS connections.
  return host.includes('tidbcloud.com');
}

// Cloud MySQL hosts (e.g. TiDB) require TLS.
if (shouldUseSsl()) {
  config.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  };
  if (process.env.DB_SSL_CA) {
    config.ssl.ca = process.env.DB_SSL_CA;
  }
}

if (!config.user || !config.password) {
  console.error('[db] Missing DB_USER or DB_PASSWORD. Set them in .env.');
}

if (shouldUseSsl()) {
  console.log('[db] TLS enabled for', host);
} else {
  console.log('[db] TLS disabled for', host);
}

let pool = null;

// returns the shared pool, creating it on first call
function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

// runs SELECT 1 to verify the connection is alive
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

// used by /api/db-test to confirm the Resources table is readable
async function getResourcesSample() {
  const p = getPool();
  const [rows] = await p.query('SELECT resource_id, title FROM Resources LIMIT 5');
  return rows;
}

module.exports = { getPool, testConnection, getResourcesSample };
