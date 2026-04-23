import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AgentAction, RegisterAgentRequest } from "../shared/types.js";
import { GameEngine } from "./game-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../../public");
const port = Number(process.env.PORT ?? 3100);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const engine = new GameEngine();

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
    const body = req.body as RegisterAgentRequest;
    const credentials = engine.registerAgent(body);
    broadcast();
    res.json(credentials);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "注册失败" });
  }
});

app.post("/api/agents/:agentId/join", (req, res) => {
  const { agentId } = req.params;
  const { secret } = req.body as { secret: string };
  if (!engine.authenticate(agentId, secret)) {
    res.status(401).json({ error: "鉴权失败" });
    return;
  }
  try {
    engine.join(agentId);
    broadcast();
    res.json({ ok: true, room: engine.getPublicState().room });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "加入失败" });
  }
});

app.get("/api/agents/:agentId/state", (req, res) => {
  const { agentId } = req.params;
  const secret = String(req.query.secret ?? "");
  if (!engine.authenticate(agentId, secret)) {
    res.status(401).json({ error: "鉴权失败" });
    return;
  }
  try {
    res.json(engine.getAgentView(agentId));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "状态读取失败" });
  }
});

app.post("/api/agents/:agentId/act", (req, res) => {
  const { agentId } = req.params;
  const { secret, action } = req.body as { secret: string; action: AgentAction };
  if (!engine.authenticate(agentId, secret)) {
    res.status(401).json({ error: "鉴权失败" });
    return;
  }
  try {
    engine.performAction(agentId, action);
    broadcast();
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "动作执行失败" });
  }
});

app.post("/api/agents/:agentId/chat", (req, res) => {
  const { agentId } = req.params;
  const { secret, text } = req.body as { secret: string; text: string };
  if (!engine.authenticate(agentId, secret)) {
    res.status(401).json({ error: "鉴权失败" });
    return;
  }
  try {
    engine.postChat(agentId, text);
    broadcast();
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "发送失败" });
  }
});

app.post("/api/agents/:agentId/leave", (req, res) => {
  const { agentId } = req.params;
  const { secret } = req.body as { secret: string };
  if (!engine.authenticate(agentId, secret)) {
    res.status(401).json({ error: "鉴权失败" });
    return;
  }
  try {
    engine.leave(agentId);
    broadcast();
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "离开失败" });
  }
});

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "room_state", payload: engine.getPublicState() }));
});

function broadcast(): void {
  const data = JSON.stringify({ type: "room_state", payload: engine.getPublicState() });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

setInterval(() => {
  broadcast();
}, 1000);

engine.start();

server.listen(port, () => {
  console.log(`Shelter Night Shift listening on http://localhost:${port}`);
});
