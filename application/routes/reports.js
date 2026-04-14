const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

function mysqlTs(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function parseDateOnly(s) {
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRangeFromPeriod(period, anchorStr) {
  const anchor = parseDateOnly(anchorStr) || new Date();
  const end = new Date(anchor);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  if (period === 'week') {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (period === 'month') {
    start.setUTCDate(start.getUTCDate() - 29);
  } else if (period === 'semester') {
    start.setUTCDate(start.getUTCDate() - 119);
  } else {
    return null;
  }
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

function getCustomRange(startStr, endStr) {
  const s = parseDateOnly(startStr);
  const e = parseDateOnly(endStr);
  if (!s || !e || s > e) return null;
  const start = new Date(s);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(e);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * FR_20: aggregate goals, milestones, reflections, bookmarks, and activity over a time window.
 * Query: period=week|month|semester|custom&anchor=YYYY-MM-DD (optional end of window)
 *        custom requires start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get('/reports/summary', requireAuth, async (req, res) => {
  try {
    const period = String(req.query.period || 'week').toLowerCase();
    const anchor = String(req.query.anchor || '').trim();
    const startQ = String(req.query.start || '').trim();
    const endQ = String(req.query.end || '').trim();

    let range;
    if (period === 'custom') {
      range = getCustomRange(startQ, endQ);
      if (!range) {
        return res.status(400).json({
          success: false,
          error: 'For period=custom, provide valid start and end as YYYY-MM-DD with start <= end.'
        });
      }
    } else if (['week', 'month', 'semester'].includes(period)) {
      range = getRangeFromPeriod(period, anchor);
    } else {
      return res.status(400).json({
        success: false,
        error: 'period must be week, month, semester, or custom.'
      });
    }

    const userId = req.session.userId;
    const pool = db.getPool();
    const startSql = mysqlTs(range.start);
    const endSql = mysqlTs(range.end);

    const [[{ goals_completed }]] = await pool.query(
      `SELECT COUNT(*) AS goals_completed
       FROM Goals
       WHERE user_id = ?
         AND status = 'completed'
         AND updated_at >= ?
         AND updated_at <= ?`,
      [userId, startSql, endSql]
    );

    const [[{ goal_completion_events }]] = await pool.query(
      `SELECT COUNT(*) AS goal_completion_events
       FROM ActivityLogs
       WHERE user_id = ?
         AND action_type = 'goal_completed'
         AND created_at >= ?
         AND created_at <= ?`,
      [userId, startSql, endSql]
    );

    const [[{ milestones_completed }]] = await pool.query(
      `SELECT COUNT(*) AS milestones_completed
       FROM Milestones m
       JOIN Projects p ON p.project_id = m.project_id
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE g.user_id = ?
         AND m.is_completed = 1
         AND m.completed_at IS NOT NULL
         AND m.completed_at >= ?
         AND m.completed_at <= ?`,
      [userId, startSql, endSql]
    );

    const [[{ reflections_written }]] = await pool.query(
      `SELECT COUNT(*) AS reflections_written
       FROM Reflections
       WHERE user_id = ?
         AND created_at >= ?
         AND created_at <= ?`,
      [userId, startSql, endSql]
    );

    const [[{ bookmarks_added }]] = await pool.query(
      `SELECT COUNT(*) AS bookmarks_added
       FROM Bookmarks
       WHERE user_id = ?
         AND created_at >= ?
         AND created_at <= ?`,
      [userId, startSql, endSql]
    );

    const [activityRows] = await pool.query(
      `SELECT action_type, COUNT(*) AS cnt
       FROM ActivityLogs
       WHERE user_id = ?
         AND created_at >= ?
         AND created_at <= ?
       GROUP BY action_type
       ORDER BY cnt DESC`,
      [userId, startSql, endSql]
    );

    const [[{ active_goals }]] = await pool.query(
      `SELECT COUNT(*) AS active_goals FROM Goals WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    const [[{ paused_goals }]] = await pool.query(
      `SELECT COUNT(*) AS paused_goals FROM Goals WHERE user_id = ? AND status = 'paused'`,
      [userId]
    );

    const [[ms]] = await pool.query(
      `SELECT
         COUNT(m.milestone_id) AS milestones_total,
         SUM(m.is_completed = 1) AS milestones_done
       FROM Milestones m
       JOIN Projects p ON p.project_id = m.project_id
       JOIN Goals g ON g.goal_id = p.goal_id
       WHERE g.user_id = ?`,
      [userId]
    );

    const milestonesTotal = Number(ms.milestones_total) || 0;
    const milestonesDone = Number(ms.milestones_done) || 0;
    const milestoneProgressPct =
      milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;

    res.json({
      success: true,
      period: period === 'custom' ? 'custom' : period,
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString()
      },
      summary: {
        goals_completed: Number(goals_completed) || 0,
        goal_completion_events: Number(goal_completion_events) || 0,
        milestones_completed: Number(milestones_completed) || 0,
        reflections_written: Number(reflections_written) || 0,
        bookmarks_added: Number(bookmarks_added) || 0
      },
      activity_by_type: Object.fromEntries(
        activityRows.map((r) => [r.action_type, Number(r.cnt) || 0])
      ),
      snapshot: {
        active_goals: Number(active_goals) || 0,
        paused_goals: Number(paused_goals) || 0,
        milestones_total: milestonesTotal,
        milestones_done: milestonesDone,
        milestones_open: Math.max(0, milestonesTotal - milestonesDone),
        milestone_progress_pct: milestoneProgressPct
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
