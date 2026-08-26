/**
 * AutoAuction — Realtime WebSocket Service
 *
 * Принимает HTTP POST от API-роутов Next.js и эмитит события всем
 * подключённым клиентам через socket.io.
 *
 * Запуск: bun run dev  (порт 3003)
 *
 * API:
 *   POST http://localhost:3003/emit
 *   Body: { event: "lot:created", data: {...} }
 *
 * Frontend подключается через:
 *   io("/?XTransformPort=3003")
 */

import { createServer } from "http";
import { Server } from "socket.io";

const PORT = 3003;

const httpServer = createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/emit") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { event, data } = JSON.parse(body);
        console.log(`[emit] ${event}`, data);
        io.emit(event, data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "autoauction-realtime" }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`[ws] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[ws] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[ws] AutoAuction realtime service on http://localhost:${PORT}`);
});
