// src/api/controllers/pedido.controller.js
const { pool } = require('../db');
const { publishPedidoConfirmado } = require('../events');

/**
 * Estructura general:
 * Pedido: { id, estado, total, creado_por, creado_en, items: [...] }
 * Item:   { id, producto_id, cantidad, precio_unitario, subtotal }
 */

// Utilidad: cargar pedido con items
async function cargarPedidoConItems(id, client = pool) {
  const p = await client.query(
    'SELECT id, estado, total, creado_por, creado_en FROM pedido WHERE id=$1',
    [id]
  );
  if (!p.rows.length) return null;

  const items = await client.query(
    `SELECT id, producto_id, cantidad, precio_unitario, subtotal
     FROM pedido_item WHERE pedido_id=$1 ORDER BY id`,
    [id]
  );

  return { ...p.rows[0], items: items.rows };
}

// GET /pedidos
const listar = async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.id, p.estado, p.total, p.creado_por, p.creado_en,
              COUNT(i.id) AS items
       FROM pedido p
       LEFT JOIN pedido_item i ON i.pedido_id = p.id
       GROUP BY p.id
       ORDER BY p.id`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /pedidos/:id
const obtener = async (req, res) => {
  try {
    const ped = await cargarPedidoConItems(req.params.id);
    if (!ped) return res.status(404).json({ error: 'No existe' });
    res.json(ped);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /pedidos  { creado_por?, items?: [{producto_id, cantidad}] }
const crear = async (req, res) => {
  const client = await pool.connect();
  try {
    const { creado_por = null, items = [] } = req.body || {};
    await client.query('BEGIN');

    const r = await client.query(
      `INSERT INTO pedido (estado, total, creado_por)
       VALUES ('CREADO', 0, $1)
       RETURNING id, estado, total, creado_por, creado_en`,
      [creado_por]
    );
    const pedido = r.rows[0];

    // Insertar items (sin tocar stock, ni precios aún)
    for (const it of items) {
      const { producto_id, cantidad } = it || {};
      if (!producto_id || !cantidad || cantidad <= 0) {
        throw new Error('items[].producto_id y cantidad > 0 son obligatorios');
      }

      // Traer precio del producto
      const pr = await client.query(
        'SELECT precio FROM producto WHERE id=$1 AND activo=TRUE',
        [producto_id]
      );
      if (!pr.rows.length) {
        throw new Error(`Producto ${producto_id} inexistente o inactivo`);
      }
      const precio_unitario = Number(pr.rows[0].precio);
      const subtotal = precio_unitario * Number(cantidad);

      await client.query(
        `INSERT INTO pedido_item (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [pedido.id, producto_id, cantidad, precio_unitario, subtotal]
      );
    }

    // Recalcular total (suma de items)
    const sum = await client.query(
      'SELECT COALESCE(SUM(subtotal),0) total FROM pedido_item WHERE pedido_id=$1',
      [pedido.id]
    );
    const total = Number(sum.rows[0].total);

    await client.query(
      'UPDATE pedido SET total=$1 WHERE id=$2',
      [total, pedido.id]
    );

    await client.query('COMMIT');

    const full = await cargarPedidoConItems(pedido.id);
    res.status(201).json(full);
  } catch (e) {
    await req?.client?.query?.('ROLLBACK').catch(()=>{});
    // si falló antes de setear req.client
    try { await pool.query('ROLLBACK'); } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
};

// PUT /pedidos/:id  { creado_por?, estado? (validaciones mínimas) }
const actualizar = async (req, res) => {
  try {
    const { creado_por, estado } = req.body || {};
    if (estado && !['CREADO','CONFIRMADO','EN_COCINA','LISTO','ENTREGADO','CANCELADO'].includes(estado)) {
      return res.status(400).json({ error: 'estado inválido' });
    }

    const r = await pool.query(
      `UPDATE pedido
       SET creado_por = COALESCE($1, creado_por),
           estado = COALESCE($2, estado)
       WHERE id=$3
       RETURNING id, estado, total, creado_por, creado_en`,
      [creado_por ?? null, estado ?? null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'No existe' });
    const full = await cargarPedidoConItems(req.params.id);
    res.json(full);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /pedidos/:id
const eliminar = async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM pedido WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'No existe' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /pedidos/:id/items  { producto_id, cantidad }
const agregarItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const pedidoId = Number(req.params.id);
    const { producto_id, cantidad } = req.body || {};
    if (!producto_id || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'producto_id y cantidad > 0 son obligatorios' });
    }

    await client.query('BEGIN');

    const p = await client.query('SELECT id, estado FROM pedido WHERE id=$1', [pedidoId]);
    if (!p.rows.length) throw new Error('Pedido no existe');
    if (p.rows[0].estado !== 'CREADO') {
      throw new Error('Solo se pueden agregar items cuando el pedido está en CREADO');
    }

    const pr = await client.query('SELECT precio FROM producto WHERE id=$1 AND activo=TRUE', [producto_id]);
    if (!pr.rows.length) throw new Error('Producto inexistente o inactivo');

    const precio_unitario = Number(pr.rows[0].precio);
    const subtotal = precio_unitario * Number(cantidad);

    await client.query(
      `INSERT INTO pedido_item (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
       VALUES ($1,$2,$3,$4,$5)`,
      [pedidoId, producto_id, cantidad, precio_unitario, subtotal]
    );

    const sum = await client.query(
      'SELECT COALESCE(SUM(subtotal),0) total FROM pedido_item WHERE pedido_id=$1',
      [pedidoId]
    );
    await client.query('UPDATE pedido SET total=$1 WHERE id=$2', [Number(sum.rows[0].total), pedidoId]);

    await client.query('COMMIT');
    const full = await cargarPedidoConItems(pedidoId);
    res.status(201).json(full);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
};

// DELETE /pedidos/:id/items/:itemId
const eliminarItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const pedidoId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    await client.query('BEGIN');

    const p = await client.query('SELECT id, estado FROM pedido WHERE id=$1', [pedidoId]);
    if (!p.rows.length) throw new Error('Pedido no existe');
    if (p.rows[0].estado !== 'CREADO') {
      throw new Error('Solo se pueden eliminar items cuando el pedido está en CREADO');
    }

    const del = await client.query('DELETE FROM pedido_item WHERE id=$1 AND pedido_id=$2 RETURNING id', [itemId, pedidoId]);
    if (!del.rows.length) throw new Error('Item no existe para este pedido');

    const sum = await client.query(
      'SELECT COALESCE(SUM(subtotal),0) total FROM pedido_item WHERE pedido_id=$1',
      [pedidoId]
    );
    await client.query('UPDATE pedido SET total=$1 WHERE id=$2', [Number(sum.rows[0].total), pedidoId]);

    await client.query('COMMIT');
    const full = await cargarPedidoConItems(pedidoId);
    res.json(full);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
};

// POST /pedidos/:id/confirmar
const confirmar = async (req, res) => {
  const client = await pool.connect();
  try {
    const pedidoId = Number(req.params.id);
    await client.query('BEGIN');

    const p = await client.query('SELECT id, estado FROM pedido WHERE id=$1 FOR UPDATE', [pedidoId]);
    if (!p.rows.length) throw new Error('Pedido no existe');
    if (p.rows[0].estado !== 'CREADO') throw new Error('El pedido ya no está en CREADO');

    // Validar stock y recalcular
    const items = await client.query(
      `SELECT i.id, i.producto_id, i.cantidad
       FROM pedido_item i
       WHERE i.pedido_id=$1
       ORDER BY i.id`,
      [pedidoId]
    );
    if (!items.rows.length) throw new Error('El pedido no tiene items');

    let total = 0;
    for (const it of items.rows) {
      const pr = await client.query(
        'SELECT precio, stock_actual FROM producto WHERE id=$1 FOR UPDATE',
        [it.producto_id]
      );
      if (!pr.rows.length) throw new Error(`Producto ${it.producto_id} inexistente`);
      const precio_unitario = Number(pr.rows[0].precio);
      const stock_actual = Number(pr.rows[0].stock_actual);
      if (stock_actual < it.cantidad) {
        throw new Error(`Stock insuficiente para producto ${it.producto_id}`);
      }
      const subtotal = precio_unitario * Number(it.cantidad);
      total += subtotal;

      // actualizar item con precio definitivo (por si cambió)
      await client.query(
        `UPDATE pedido_item
         SET precio_unitario=$1, subtotal=$2
         WHERE id=$3`,
        [precio_unitario, subtotal, it.id]
      );
    }

    // Descontar stock (reserva real simple)
    for (const it of items.rows) {
      await client.query(
        'UPDATE producto SET stock_actual = stock_actual - $1 WHERE id=$2',
        [it.cantidad, it.producto_id]
      );
    }

    await client.query(
      `UPDATE pedido
       SET estado='CONFIRMADO', total=$1
       WHERE id=$2`,
      [total, pedidoId]
    );

    await client.query('COMMIT');
    const full = await cargarPedidoConItems(pedidoId);

    // publicar evento asincrónico (no bloquea la respuesta)
    publishPedidoConfirmado({
  pedidoId,
  estado: 'CONFIRMADO',
  total: full.total,
  items: full.items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
  timestamp: Date.now()
    }).catch(err => console.error('[events] publish error', err));



    res.json(full);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
};

module.exports = {
  listar, obtener, crear, actualizar, eliminar,
  agregarItem, eliminarItem, confirmar
};
