process.env.OTEL_SERVICE_NAME = "api";
require("../otel").startOtel();

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool } = require('./db');



dotenv.config({ override: false });

const app = express();


app.use(express.json());
app.use(cors({ origin: '*' }));


app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/db/health', async (_req, res) => {
  try {
    const r = await pool.query(
      'select now() as now, current_database() as db, current_user as usr;'
    );
    res.json({ ok: true, ...r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const productos = require('./controllers/producto.controller');
const pedidos = require('./controllers/pedido.controller');
const auth = require('./auth/auth.controller');

const {
  auth: authMiddleware,
  requireRole,
} = require('./auth/auth.middleware');


app.post('/auth/login', auth.login);
app.get('/auth/me', authMiddleware, auth.me);


app.get('/productos', authMiddleware, productos.listar);
app.get('/productos/:id', authMiddleware, productos.obtener);


app.post(
  '/productos',
  authMiddleware,
  requireRole('admin'),
  productos.crear
);


app.put(
  '/productos/:id',
  authMiddleware,
  requireRole('admin'),
  productos.actualizar
);


app.delete(
  '/productos/:id',
  authMiddleware,
  requireRole('admin'),
  productos.eliminar
);


app.get('/pedidos', authMiddleware, pedidos.listar);
app.get('/pedidos/:id', authMiddleware, pedidos.obtener);


app.post(
  '/pedidos',
  authMiddleware,
  requireRole('mozo', 'admin'),
  pedidos.crear
);


app.put(
  '/pedidos/:id',
  authMiddleware,
  requireRole('admin'),
  pedidos.actualizar
);


app.delete(
  '/pedidos/:id',
  authMiddleware,
  requireRole('admin'),
  pedidos.eliminar
);


app.post(
  '/pedidos/:id/items',
  authMiddleware,
  requireRole('mozo', 'admin'),
  pedidos.agregarItem
);


app.delete(
  '/pedidos/:id/items/:itemId',
  authMiddleware,
  requireRole('mozo', 'admin'),
  pedidos.eliminarItem
);


app.post(
  '/pedidos/:id/confirmar',
  authMiddleware,
  requireRole('cocina', 'admin'),
  pedidos.confirmar
);


app.post(
  '/pedidos/:id/listo',
  authMiddleware,
  requireRole('cocina', 'admin'),
  pedidos.marcarListo
);


app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});


const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () =>
  console.log(`[api] listening on http://localhost:${PORT}`)
);
