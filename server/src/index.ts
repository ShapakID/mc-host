import path from "path";
import fs from "fs";
import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config";
import { authMiddleware, validateWsToken } from "./middleware/auth";
import { minecraftService } from "./services/minecraftService";
import { getSystemStats } from "./services/systemService";

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend build if present
const possiblePaths = [
  path.resolve(__dirname, "../../client/dist"),
  path.resolve(__dirname, "../../../client/dist"),
  path.resolve(process.cwd(), "client/dist"),
  path.resolve(process.cwd(), "../client/dist")
];

let clientDistPath = "";
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    clientDistPath = p;
    break;
  }
}

if (clientDistPath) {
  console.log(`[MC-Server-Manager] Serving static frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
} else {
  console.warn("[MC-Server-Manager] Client dist not found in standard paths:", possiblePaths);
}

// Wildcard SPA route fallback
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
    return next();
  }
  if (clientDistPath) {
    const indexPath = path.join(clientDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  res.send(`<h2>MC Server Manager Backend Active</h2><p>Frontend dist not found. Expected at ${clientDistPath}</p>`);
});

// Public health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", timestamp: Date.now() });
});

// Authenticated routes
app.get("/api/status", authMiddleware, (_req, res) => {
  res.json({
    serverStatus: minecraftService.getStatus(),
    system: getSystemStats()
  });
});

app.post("/api/server/start", authMiddleware, (_req, res) => {
  const result = minecraftService.start();
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/api/server/stop", authMiddleware, (_req, res) => {
  const result = minecraftService.stop();
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/api/server/command", authMiddleware, (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "Missing or invalid command string" });
    return;
  }
  const ok = minecraftService.sendCommand(command);
  res.json({ success: ok });
});

app.get("/api/server/logs", authMiddleware, (_req, res) => {
  res.json({ logs: minecraftService.getLogs() });
});

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const token = url.searchParams.get("token") || "";

  if (!validateWsToken(token)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws: WebSocket) => {
  // Send current status on connect
  ws.send(JSON.stringify({ type: "status", data: minecraftService.getStatus() }));

  const onLog = (line: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "log", data: line }));
    }
  };

  const onStatus = (status: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "status", data: status }));
    }
  };

  minecraftService.on("log", onLog);
  minecraftService.on("status", onStatus);

  ws.on("message", (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === "command" && typeof parsed.command === "string") {
        minecraftService.sendCommand(parsed.command);
      }
    } catch {
      // Ignore malformed WS payloads
    }
  });

  ws.on("close", () => {
    minecraftService.off("log", onLog);
    minecraftService.off("status", onStatus);
  });
});

server.listen(config.port, config.host, () => {
  console.log(`[MC-Server-Manager] Server listening on http://${config.host}:${config.port}`);
});

export { app, server };
