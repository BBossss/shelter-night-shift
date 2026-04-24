import express from "express";
import type { Express } from "express";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { AgentAction, RegisterAgentRequest } from "../shared/types.js";
import { GameEngine } from "./game-engine.js";
import { validateAgentAction, validateChatText, validateRegisterAgentRequest, validateSecret } from "./validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../../public");
const port = Number(process.env.PORT ?? 3100);
const host = process.env.HOST ?? "127.0.0.1";

export function createApp(engine: GameEngine, broadcast: () => void = () => undefined): Express {
  const app = express();

  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/api/room", (_req, res) => {
    res.json(engine.getPublicState());
  });

  app.post("/api/room/reset", (_req, res) => {
    engine.resetRoom();
    broadcast();
    res.json(engine.getPublicState());
  });

  app.post("/api/agents/register", (req, res) => {
    try {
      const body = validateRegisterAgentRequest(req.body) as RegisterAgentRequest;
      const credentials = engine.registerAgent(body);
      broadcast();
      res.json(credentials);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "注册失败" });
    }
  });

  app.post("/api/agents/:agentId/join", (req, res) => {
    const { agentId } = req.params;
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const secret = validateSecret(body.secret);
      if (!engine.authenticate(agentId, secret)) {
        res.status(401).json({ error: "鉴权失败" });
        return;
      }
      engine.join(agentId);
      broadcast();
      res.json({ ok: true, room: engine.getPublicState().room });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "加入失败" });
    }
  });

  app.get("/api/agents/:agentId/state", (req, res) => {
    const { agentId } = req.params;
    try {
      const secret = validateSecret(req.query.secret);
      if (!engine.authenticate(agentId, secret)) {
        res.status(401).json({ error: "鉴权失败" });
        return;
      }
      res.json(engine.getAgentView(agentId));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "状态读取失败" });
    }
  });

  app.post("/api/agents/:agentId/act", (req, res) => {
    const { agentId } = req.params;
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const secret = validateSecret(body.secret);
      const action = validateAgentAction(body.action) as AgentAction;
      if (!engine.authenticate(agentId, secret)) {
        res.status(401).json({ error: "鉴权失败" });
        return;
      }
      engine.performAction(agentId, action);
      broadcast();
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "动作执行失败" });
    }
  });

  app.post("/api/agents/:agentId/chat", (req, res) => {
    const { agentId } = req.params;
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const secret = validateSecret(body.secret);
      const text = validateChatText(body.text);
      if (!engine.authenticate(agentId, secret)) {
        res.status(401).json({ error: "鉴权失败" });
        return;
      }
      engine.postChat(agentId, text);
      broadcast();
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "发送失败" });
    }
  });

  app.post("/api/agents/:agentId/leave", (req, res) => {
    const { agentId } = req.params;
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const secret = validateSecret(body.secret);
      if (!engine.authenticate(agentId, secret)) {
        res.status(401).json({ error: "鉴权失败" });
        return;
      }
      engine.leave(agentId);
      broadcast();
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "离开失败" });
    }
  });

  return app;
}

export function startServer(): void {
  const engine = new GameEngine();
  const server = createServer();
  const wss = new WebSocketServer({ server });

  function broadcast(): void {
    const data = JSON.stringify({ type: "room_state", payload: engine.getPublicState() });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  }

  const app = createApp(engine, broadcast);
  server.on("request", app);

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "room_state", payload: engine.getPublicState() }));
  });

  setInterval(() => {
    broadcast();
  }, 1000);

  engine.start();

  server.listen(port, host, () => {
    console.log(`Shelter Night Shift listening on http://${host}:${port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
