// src/api/controllers/pedido.controller.js
const { pool } = require('../db');
const { publishPedidoConfirmado, publishPedidoListo } = require('../events');

async function cargarPedidoConItems(id, client = pool) {
  const p = await client.query(
    'SELECT id, mesa, estado, total, creado_por, creado_en FROM pedido WHERE id=$1',
    [id]
  );
  if (!p.rows.length) return null;

  const items = await client.query(
    `SELECT i.id, i.producto_id, pr.nombre AS producto_nombre,
            i.cantidad, i.precio_unitario, i.subtotal
     FROM pedido_item i
     JOIN producto pr ON pr.id = i.producto_id
     WHERE i.pedido_id=$1
     ORDER BY i.id`,
    [id]
  );

  return { ...p.rows[0], items: items.rows };
}

const listar = async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.id, p.mesa, p.estado, p.total, p.creado_por, p.creado_en,
             COUNT(i.id) AS items
      FROM pedido p
      LEFT JOIN pedido_item i ON i.pedido_id = p.id
      GROUP BY p.id
      ORDER BY p.id;
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const obtener = async (req, res) => {
  try {
    const ped = await cargarPedidoConItems(req.params.id);
    if (!ped) return res.status(404).json({ error: 'No existe' });
    res.json(ped);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};


const crear = async (req, res) => {
  const client = await pool.connect();
  try {
    const { mesa, creado_por = null } = req.body || {};
    if (!mesa || !mesa.trim()) {
      return res.status(400).json({ error: 'El campo mesa es obligatorio' });
    }

    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO pedido (mesa, estado, total, creado_por)
       VALUES ($1, 'CREADO', 0, $2)
       RETURNING id, mesa, estado, total, creado_por, creado_en`,
      [mesa.trim(), creado_por]
    );
    await client.query('COMMIT');
    console.log('[crear] pedido', r.rows[0].id, 'creado');
    res.status(201).json(r.rows[0]);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
};


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
       RETURNING id, mesa, estado, total, creado_por, creado_en`,
      [creado_por ?? null, estado ?? null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'No existe' });
    const full = await cargarPedidoConItems(req.params.id);
    res.json(full);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};


const eliminar = async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM pedido WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'No existe' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};


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

    console.log('[agregarItem] producto', producto_id, 'agregado a pedido', pedidoId);
    const full = await cargarPedidoConItems(pedidoId);
    res.status(201).json(full);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[agregarItem] error', e);
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
};


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

    const sum = await client.query('SELECT COALESCE(SUM(subtotal),0) total FROM pedido_item WHERE pedido_id=$1', [pedidoId]);
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


async function confirmar(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('UPDATE pedido SET estado=$1 WHERE id=$2 RETURNING *', ['CONFIRMADO', id]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });

    const pedido = rows[0];
    console.log('[confirmar] pedido', pedido.id, 'confirmado ✅');
    await publishPedidoConfirmado({
      pedidoId: pedido.id,
      mesa: pedido.mesa,
      estado: pedido.estado,
      total: pedido.total || 0,
      timestamp: Date.now(),
    });

    res.json({ ok: true, pedido });
  } catch (e) {
    console.error('[confirmar] error', e);
    res.status(500).json({ error: e.message });
  }
}


async function marcarListo(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('UPDATE pedido SET estado=$1 WHERE id=$2 RETURNING *', ['LISTO', id]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });

    const pedido = rows[0];
    console.log('[listo] pedido', pedido.id, 'marcado como LISTO 👨‍🍳');
    await publishPedidoListo({
      pedidoId: pedido.id,
      mesa: pedido.mesa,
      estado: pedido.estado,
      timestamp: Date.now(),
    });

    res.json({ ok: true, pedido });
  } catch (e) {
    console.error('[listo] error', e);
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  agregarItem,
  eliminarItem,
  confirmar,
  marcarListo,
};
