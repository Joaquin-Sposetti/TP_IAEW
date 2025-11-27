// src/api/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'app',
  password: process.env.POSTGRES_PASSWORD || 'app',
  database: process.env.POSTGRES_DB || 'restaurante',
});


(async () => {
  try {
    // Verificamos si existe la tabla pedido_item
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedido_item (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER REFERENCES pedido(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1
      );
    `);

    // Agrega columna precio_unitario si falta
    const colPrecio = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='pedido_item' AND column_name='precio_unitario';
    `);
    if (colPrecio.rowCount === 0) {
      console.log('[db] ➕ Agregando columna precio_unitario...');
      await pool.query(`ALTER TABLE pedido_item ADD COLUMN precio_unitario numeric(10,2) DEFAULT 0;`);
    }

    // Agrega columna subtotal si falta
    const colSubtotal = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='pedido_item' AND column_name='subtotal';
    `);
    if (colSubtotal.rowCount === 0) {
      console.log('[db] ➕ Agregando columna subtotal...');
      await pool.query(`ALTER TABLE pedido_item ADD COLUMN subtotal numeric(10,2) DEFAULT 0;`);
    }

    console.log('[db] ✅ Estructura de pedido_item verificada');
  } catch (err) {
    console.error('[db] ❌ Error verificando estructura:', err.message);
  }
})();

module.exports = { pool };
