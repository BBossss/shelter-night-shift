import test from "node:test";
import assert from "node:assert/strict";
import { Duplex } from "node:stream";
import { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";

import type { Express } from "express";

import { GameEngine } from "../src/server/game-engine.js";
import { createApp } from "../src/server/server.js";
import type { PersonaProfile } from "../src/shared/types.js";

const persona: PersonaProfile = {
  codename: "Route",
  archetype: "路由测试员",
  style: "直接",
  risk: "low",
  catchphrase: "收到。",
};

class MockSocket extends Duplex {
  readonly chunks: Buffer[] = [];

  _read(): void {
    // IncomingMessage reads are fed manually in request().
  }

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }
}

test("agent routes return 400 for malformed payloads and 401 for bad credentials", async () => {
  const engine = new GameEngine();
  const app = createApp(engine);

  const badRegister = await request(app, "POST", "/api/agents/register", { name: "Bad", role: "admin", persona });
  assert.equal(badRegister.status, 400);

  const credentials = engine.registerAgent({ name: "林医生", role: "doctor", persona });

  const malformedJoin = await request(app, "POST", `/api/agents/${credentials.agentId}/join`, {});
  assert.equal(malformedJoin.status, 400);

  const badSecretJoin = await request(app, "POST", `/api/agents/${credentials.agentId}/join`, { secret: "wrong" });
  assert.equal(badSecretJoin.status, 401);
});

async function request(app: Express, method: string, url: string, body?: unknown): Promise<{ status: number; body: unknown }> {
  const payload = body === undefined ? "" : JSON.stringify(body);
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as unknown as Socket);
  req.method = method;
  req.url = url;
  req.headers = {
    host: "localhost",
    ...(payload
      ? {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(payload)),
        }
      : {}),
  };

  const res = new ServerResponse(req);
  res.assignSocket(socket as unknown as Socket);

  const finished = new Promise<{ status: number; body: unknown }>((resolve) => {
    res.on("finish", () => {
      const raw = Buffer.concat(socket.chunks).toString("utf8");
      const bodyText = raw.slice(raw.indexOf("\r\n\r\n") + 4);
      resolve({
        status: res.statusCode,
        body: bodyText ? JSON.parse(bodyText) : undefined,
      });
    });
  });

  app(req, res);
  req.push(payload);
  req.push(null);

  return finished;
}
