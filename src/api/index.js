// src/api/index.js
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const { pool } = require('./db');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
});

app.get('/db/health', async (_req, res) => {
  try {
    const r = await pool.query('select now() as now, current_database() as db, current_user as usr;');
    res.json({ ok: true, ...r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- rutas CRUD de Producto (agregaremos abajo) ---

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});


const productos = require('./controllers/producto.controller');
const pedidos = require('./controllers/pedido.controller');

app.get('/productos', productos.listar);
app.get('/productos/:id', productos.obtener);
app.post('/productos', productos.crear);
app.put('/productos/:id', productos.actualizar);
app.delete('/productos/:id', productos.eliminar);


app.get('/pedidos', pedidos.listar);
app.get('/pedidos/:id', pedidos.obtener);
app.post('/pedidos', pedidos.crear);
app.put('/pedidos/:id', pedidos.actualizar);
app.delete('/pedidos/:id', pedidos.eliminar);

app.post('/pedidos/:id/items', pedidos.agregarItem);
app.delete('/pedidos/:id/items/:itemId', pedidos.eliminarItem);

app.post('/pedidos/:id/confirmar', pedidos.confirmar);
