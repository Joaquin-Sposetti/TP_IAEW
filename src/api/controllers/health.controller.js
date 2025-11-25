// src/api/controllers/health.controller.js
const { pool } = require('../db');

async function liveness(_req, res) {
  res.json({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
}

async function dbHealth(_req, res) {
  try {
    const r = await pool.query(
      'select now() as now, current_database() as db, current_user as usr;'
    );
    return res.json({
      ok: true,
      ...r.rows[0],
    });
  } catch (e) {
    console.error('[health] db error:', e.message);
    return res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
}

module.exports = {
  liveness,
  dbHealth,
};
