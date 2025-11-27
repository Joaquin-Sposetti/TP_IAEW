// src/api/events.js
const amqplib = require('amqplib');

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'pedidos.events';

let _conn, _ch;


async function getChannel() {
  if (_ch) return _ch;

  console.log('[events] connecting to', RABBIT_URL);
  _conn = await amqplib.connect(RABBIT_URL);
  console.log('[events] connected');

  _ch = await _conn.createChannel();
  await _ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  console.log('[events] exchange asserted:', EXCHANGE);

  return _ch;
}


async function publish(routingKey, payload) {
  const ch = await getChannel();
  const ok = ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    contentType: 'application/json',
  });

  if (ok) console.log(`[events] published ${routingKey}`);
  else console.warn(`[events] failed to publish ${routingKey}`);

  return { ok };
}


async function publishPedidoConfirmado(payload) {
  return publish('pedido.confirmado', payload);
}


async function publishPedidoListo(payload) {
  return publish('pedido.listo', payload);
}


async function publishEvento(tipo, payload) {
  return publish(tipo, payload);
}

module.exports = {
  publishPedidoConfirmado,
  publishPedidoListo,
  publishEvento,
};
