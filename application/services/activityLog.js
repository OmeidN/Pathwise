const db = require('../db/connection');

/**
 * Best-effort activity row; failures are logged and do not throw.
 */
async function logActivity({ userId, actionType, entityType = null, entityId = null, detail = null }) {
  try {
    const pool = db.getPool();
    const detailStr =
      detail == null ? null : typeof detail === 'string' ? detail : JSON.stringify(detail);
    await pool.query(
      `INSERT INTO ActivityLogs (user_id, action_type, entity_type, entity_id, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [userId || null, actionType, entityType, entityId, detailStr]
    );
  } catch (err) {
    console.warn('[activityLog]', err.message);
  }
}

module.exports = { logActivity };
