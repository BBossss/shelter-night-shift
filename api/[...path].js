import { GameEngine } from "../dist/server/game-engine.js";
import { createApp } from "../dist/server/server.js";

const engine = new GameEngine();
const app = createApp(engine);

export default function handler(req, res) {
  app(req, res);
}
