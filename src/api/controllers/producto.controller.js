// src/api/controllers/producto.controller.js
const { pool } = require('../db');

const listar = async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nombre, precio, stock_actual, activo, creado_en FROM producto ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const obtener = async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nombre, precio, stock_actual, activo, creado_en FROM producto WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'No existe' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const crear = async (req, res) => {
  try {
    const { nombre, precio, stock_actual = 0, activo = true } = req.body || {};
    if (!nombre || precio == null) return res.status(400).json({ error: 'nombre y precio son obligatorios' });
    const r = await pool.query(
      `INSERT INTO producto (nombre, precio, stock_actual, activo)
       VALUES ($1,$2,$3,$4) RETURNING id, nombre, precio, stock_actual, activo, creado_en`,
      [nombre, precio, stock_actual, activo]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const actualizar = async (req, res) => {
  try {
    const { nombre, precio, stock_actual, activo } = req.body || {};
    const r = await pool.query(
      `UPDATE producto
       SET nombre = COALESCE($1, nombre),
           precio = COALESCE($2, precio),
           stock_actual = COALESCE($3, stock_actual),
           activo = COALESCE($4, activo)
       WHERE id=$5
       RETURNING id, nombre, precio, stock_actual, activo, creado_en`,
      [nombre, precio, stock_actual, activo, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'No existe' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const eliminar = async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM producto WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'No existe' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
