// src/ws/index.js
const WebSocket = require('ws');
const amqplib = require('amqplib');

const PORT = Number(process.env.WS_PORT || 8090);
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'pedidos.events';

const wss = new WebSocket.Server({ port: PORT });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'hello', msg: 'conectado a WS', ts: Date.now() }));
  ws.on('close', () => clients.delete(ws));
});

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

(async function run() {
  const conn = await amqplib.connect(RABBIT_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

  const q = await ch.assertQueue('', { exclusive: true }); // cola efímera por servicio
  await ch.bindQueue(q.queue, EXCHANGE, 'pedido.*');

  console.log(`[ws] listening on ws://localhost:${PORT} and consuming '${EXCHANGE}'`);

  ch.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const content = msg.content ? JSON.parse(msg.content.toString()) : {};
      const routingKey = msg.fields.routingKey;
      const event = { type: routingKey, payload: content, ts: Date.now() };
      console.log('[ws] event', event);
      broadcast(event);
      ch.ack(msg);
    } catch (err) {
      console.error('[ws] consume error', err);
      ch.nack(msg, false, false); // descartar si hubo error de parseo
    }
  }, { noAck: false });
})().catch(err => {
  console.error('[ws] fatal', err);
  process.exit(1);
});
