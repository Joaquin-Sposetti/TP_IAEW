// src/ws/index.js  (sin dotenv)
const WebSocket = require('ws');
const amqplib = require('amqplib');

const PORT = Number(process.env.WS_PORT || 8090);
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'pedidos.events';

const wss = new WebSocket.Server({ port: PORT });
const clients = new Set();

wss.on('listening', () => {
  console.log(`[ws] listening on ws://localhost:${PORT}`);
});
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'hello', msg: 'conectado a WS', ts: Date.now() }));
  ws.on('close', () => clients.delete(ws));
});
wss.on('error', (e) => console.error('[ws] server error', e));

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

(async function run() {
  const conn = await amqplib.connect(RABBIT_URL);
  console.log('[ws] AMQP connected');
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  const q = await ch.assertQueue('', { exclusive: true });
  await ch.bindQueue(q.queue, EXCHANGE, 'pedido.*');
  console.log(`[ws] consuming '${EXCHANGE}' with binding 'pedido.*'`);

  ch.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      const routingKey = msg.fields.routingKey;
      broadcast({ type: routingKey, payload, ts: Date.now() });
      ch.ack(msg);
    } catch (e) {
      console.error('[ws] consume error', e);
      ch.nack(msg, false, false);
    }
  }, { noAck: false });
})().catch((err) => {
  console.error('[ws] fatal', err);
  process.exit(1);
});
