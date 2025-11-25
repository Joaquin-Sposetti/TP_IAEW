// test_ws.js
const WebSocket = require('ws');

// 🔑 Pega aquí tu token obtenido del POST /auth/login
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjQxMDQxMTUsImV4cCI6MTc2NDEwNzcxNX0.H_rNEmCh3suOuomkK1GX-ABffViDA2g7d5ttMoPvmhA";

const ws = new WebSocket("ws://localhost:8090", {
  headers: { Authorization: `Bearer ${token}` },
});

ws.on("open", () => console.log("✅ Conectado al WS"));
ws.on("message", (msg) => console.log("📩 Mensaje recibido:", msg.toString()));
ws.on("close", () => console.log("❌ Conexión cerrada"));
ws.on("error", (err) => console.error("⚠️ Error:", err.message));
