// src/api/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost', // en Docker: 'db'
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'app',
  password: process.env.POSTGRES_PASSWORD || 'app',
  database: process.env.POSTGRES_DB || 'restaurante',
});

module.exports = { pool };
