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

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const BUILD_ID = 'tidb-tls-url-v1';

const host = (process.env.DB_HOST || 'localhost').trim();
const port = parseInt(process.env.DB_PORT, 10) || 3306;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME || 'pathwise';

const poolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true
};

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isTiDbHost(hostname) {
  return hostname.includes('tidbcloud.com');
}

function mustUseTls(hostname) {
  if (isTiDbHost(hostname)) return true;
  if (isLocalHost(hostname)) return false;

  const flag = String(process.env.DB_SSL || '').trim().toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;
  if (flag === 'false' || flag === '0' || flag === 'no') return false;

  return process.env.NODE_ENV === 'production';
}

function buildTlsOptions() {
  const caPath = path.join(__dirname, 'certs', 'isrgrootx1.pem');
  const tls = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  };

  if (process.env.DB_SSL_CA) {
    tls.ca = process.env.DB_SSL_CA;
    return tls;
  }

  if (fs.existsSync(caPath)) {
    tls.ca = fs.readFileSync(caPath, 'utf8');
  }

  if (!tls.ca) {
    tls.rejectUnauthorized = false;
  }

  return tls;
}

function buildPoolConfig() {
  const useTls = mustUseTls(host);

  if (!useTls) {
    return {
      ...poolOptions,
      host,
      port,
      user,
      password,
      database,
      mode: 'plain'
    };
  }

  if (!user || !password) {
    return {
      ...poolOptions,
      host,
      port,
      user,
      password,
      database,
      mode: 'tls-missing-credentials'
    };
  }

  const tls = buildTlsOptions();
  const sslQuery = encodeURIComponent(JSON.stringify(tls));
  const uri =
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}?ssl=${sslQuery}`;

  return {
    ...poolOptions,
    uri,
    mode: 'tls-url',
    tls,
    host,
    port,
    database
  };
}

const resolvedConfig = buildPoolConfig();
const useTls = resolvedConfig.mode.startsWith('tls');

if (!user || !password) {
  console.error('[db] Missing DB_USER or DB_PASSWORD. Set them in .env.');
}

console.log(
  '[db]',
  BUILD_ID,
  '| host:', host,
  '| mode:', resolvedConfig.mode,
  '| tls:', useTls
);

let pool = null;

function getPool() {
  if (!pool) {
    if (resolvedConfig.uri) {
      pool = mysql.createPool(resolvedConfig.uri);
    } else {
      pool = mysql.createPool({
        host: resolvedConfig.host,
        port: resolvedConfig.port,
        user,
        password,
        database: resolvedConfig.database,
        ...poolOptions
      });
    }
  }
  return pool;
}

function getDebugInfo() {
  const caPath = path.join(__dirname, 'certs', 'isrgrootx1.pem');
  return {
    buildId: BUILD_ID,
    host,
    port,
    database,
    mode: resolvedConfig.mode,
    tls: useTls,
    nodeEnv: process.env.NODE_ENV || null,
    dbSslEnv: process.env.DB_SSL || null,
    caFileExists: fs.existsSync(caPath),
    hasDbHost: Boolean(process.env.DB_HOST),
    hasDbUser: Boolean(process.env.DB_USER),
    hasDbPassword: Boolean(process.env.DB_PASSWORD)
  };
}

async function testConnection() {
  const p = getPool();
  try {
    const [rows] = await p.query('SELECT 1 AS one');
    if (Array.isArray(rows) && rows[0] && rows[0].one === 1) {
      return { ok: true, message: 'Database connection OK', tls: useTls, mode: resolvedConfig.mode };
    }
    return { ok: false, message: 'Unexpected response from database' };
  } catch (err) {
    return { ok: false, error: err.message, tls: useTls, mode: resolvedConfig.mode };
  }
}

async function getResourcesSample() {
  const p = getPool();
  const [rows] = await p.query('SELECT resource_id, title FROM Resources LIMIT 5');
  return rows;
}

module.exports = { getPool, testConnection, getResourcesSample, getDebugInfo };
