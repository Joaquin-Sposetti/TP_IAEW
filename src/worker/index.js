// src/worker/index.js
const amqp = require('amqplib');
const { Pool } = require('pg');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const EXCHANGE = 'pedidos.events';
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'app',
  password: process.env.POSTGRES_PASSWORD || 'app',
  database: process.env.POSTGRES_DB || 'restaurante'
});

async function main() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  const q = await ch.assertQueue('', { exclusive: true });
  await ch.bindQueue(q.queue, EXCHANGE, 'pedido.confirmado');
  console.log('[worker] listening pedido.confirmado');

  ch.consume(q.queue, async (msg) => {
    if (!msg) return;
    const evt = JSON.parse(msg.content.toString());
    const { pedidoId } = evt;
    console.log('[worker] recibido', evt);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE pedido SET estado='EN_COCINA' WHERE id=$1`, [pedidoId]);
      await client.query('COMMIT');
      console.log('[worker] pedido', pedidoId, '-> EN_COCINA');

      setTimeout(async () => {
        const c2 = await pool.connect();
        try {
          await c2.query(`UPDATE pedido SET estado='LISTO' WHERE id=$1`, [pedidoId]);
          console.log('[worker] pedido', pedidoId, '-> LISTO');
        } finally { c2.release(); }
      }, 5000);
    } catch (e) {
      console.error('[worker] error', e.message);
      try { await client.query('ROLLBACK'); } catch {}
    } finally { client.release(); }

    ch.ack(msg);
  });
}

main().catch(err => { console.error('[worker] fatal', err); process.exit(1); });
