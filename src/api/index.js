// src/api/index.js
const express = require('express');
const dotenv = require('dotenv');

dotenv.config({ override: false });

const health = require('./controllers/health.controller');
const productos = require('./controllers/producto.controller');
const pedidos = require('./controllers/pedido.controller');
const authController = require('./auth/auth.controller');
const { auth, requireRole } = require('./auth/auth.middleware');

const app = express();

app.use(express.json());

// ---------- Health ----------
app.get('/health', health.liveness);
app.get('/db/health', health.dbHealth);

// ---------- Auth ----------
app.post('/auth/login', authController.login);
app.get('/auth/me', auth, authController.me);

// ---------- Productos ----------
// Ejemplo de políticas de acceso:
// - listar/obtener: cualquier usuario autenticado
// - crear/actualizar/eliminar: solo admin
app.get('/productos', auth, productos.listar);
app.get('/productos/:id', auth, productos.obtener);
app.post('/productos', auth, requireRole(['admin']), productos.crear);
app.put('/productos/:id', auth, requireRole(['admin']), productos.actualizar);
app.delete('/productos/:id', auth, requireRole(['admin']), productos.eliminar);

// ---------- Pedidos ----------
// - listar/obtener: cualquier usuario autenticado
// - crear/editar/items: mozo o admin
// - eliminar: admin
// - confirmar: cocina o admin
app.get('/pedidos', auth, pedidos.listar);
app.get('/pedidos/:id', auth, pedidos.obtener);
app.post('/pedidos', auth, requireRole(['mozo', 'admin']), pedidos.crear);
app.put('/pedidos/:id', auth, requireRole(['mozo', 'admin']), pedidos.actualizar);
app.delete('/pedidos/:id', auth, requireRole(['admin']), pedidos.eliminar);
app.post(
  '/pedidos/:id/items',
  auth,
  requireRole(['mozo', 'admin']),
  pedidos.agregarItem
);
app.delete(
  '/pedidos/:id/items/:itemId',
  auth,
  requireRole(['mozo', 'admin']),
  pedidos.eliminarItem
);
app.post(
  '/pedidos/:id/confirmar',
  auth,
  requireRole(['cocina', 'admin']),
  pedidos.confirmar
);

// ---------- 404 y errores ----------
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ---------- Inicio del server ----------
const PORT = Number(process.env.PORT || 8080);

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
