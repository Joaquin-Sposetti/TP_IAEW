// test_ws.js
const WebSocket = require('ws');

// 🔑 Pega aquí tu token obtenido del POST /auth/login
const token = "";

const ws = new WebSocket("ws://localhost:8090", {
  headers: { Authorization: `Bearer ${token}` },
});

ws.on("open", () => console.log("✅ Conectado al WS"));
ws.on("message", (msg) => console.log("📩 Mensaje recibido:", msg.toString()));
ws.on("close", () => console.log("❌ Conexión cerrada"));
ws.on("error", (err) => console.error("⚠️ Error:", err.message));
