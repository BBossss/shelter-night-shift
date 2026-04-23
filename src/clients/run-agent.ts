import process from "node:process";

import type { AgentRole } from "../shared/types.js";
import { GameApiClient } from "./api.js";
import { loadPersona, type PersonaScript } from "./persona-loader.js";
import { chooseAction } from "./strategy.js";

interface AgentRuntimeOptions {
  baseUrl: string;
  pollMs: number;
  personaPath: string;
}

class AgentRuntime {
  private readonly api: GameApiClient;
  private identity: Awaited<ReturnType<GameApiClient["registerAgent"]>> | null = null;
  private lastSeenTick = -1;
  private lastChattedTick = -99;
  private leaveInFlight = false;

  constructor(
    private readonly options: AgentRuntimeOptions,
    private readonly persona: PersonaScript,
  ) {
    this.api = new GameApiClient(options.baseUrl);
  }

  async run(): Promise<void> {
    this.identity = await this.api.registerAgent({
      name: this.persona.name,
      role: this.persona.role,
      persona: this.persona.profile,
    });
    await this.api.joinAgent(this.identity.agentId, this.identity.secret);

    console.log(`[${this.persona.role}] registered ${this.persona.name} as ${this.identity.agentId}`);
    await this.sendChat(this.persona.voice.ready[0] ?? this.persona.profile.catchphrase, -1);

    await this.loop();
  }

  async shutdown(): Promise<void> {
    if (!this.identity || this.leaveInFlight) {
      return;
    }
    this.leaveInFlight = true;
    try {
      await this.api.leave(this.identity.agentId, this.identity.secret);
    } catch (error) {
      console.error(`[${this.persona.role}] leave failed: ${compactError(error)}`);
    }
  }

  private async loop(): Promise<void> {
    if (!this.identity) {
      return;
    }

    for (;;) {
      try {
        const state = await this.api.getAgentState(this.identity.agentId, this.identity.secret);

        if (state.room.phase === "success") {
          await this.sendChat(this.persona.voice.success[0] ?? this.persona.profile.catchphrase, state.room.tick);
          break;
        }

        if (state.room.phase === "failure") {
          await this.sendChat(this.persona.voice.failure[0] ?? this.persona.profile.catchphrase, state.room.tick);
          break;
        }

        if (state.room.tick !== this.lastSeenTick) {
          this.lastSeenTick = state.room.tick;
          if (state.room.phase === "active") {
            await this.handleTick(state);
          }
        }
      } catch (error) {
        console.error(`[${this.persona.role}] poll failed: ${compactError(error)}`);
      }

      await delay(this.options.pollMs);
    }
  }

  private async handleTick(state: Awaited<ReturnType<GameApiClient["getAgentState"]>>): Promise<void> {
    if (!this.identity) {
      return;
    }

    const decision = chooseAction(state, this.persona);
    try {
      await this.api.act(this.identity.agentId, this.identity.secret, decision.action);
      console.log(`[${this.persona.role}] tick ${state.room.tick} -> ${formatAction(decision.action)}`);
    } catch (error) {
      console.error(`[${this.persona.role}] action rejected: ${compactError(error)}`);
    }

    if (decision.chat && shouldChat(this.persona, state.room.tick, this.lastChattedTick)) {
      await this.sendChat(decision.chat.text, state.room.tick);
    }
  }

  private async sendChat(text: string, tick: number): Promise<void> {
    if (!this.identity) {
      return;
    }
    try {
      await this.api.chat(this.identity.agentId, this.identity.secret, text);
      this.lastChattedTick = tick;
      console.log(`[${this.persona.role}] chat -> ${text}`);
    } catch (error) {
      console.error(`[${this.persona.role}] chat rejected: ${compactError(error)}`);
    }
  }
}

function parseArgs(argv: string[]): AgentRuntimeOptions {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) {
      continue;
    }
    const key = part.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args.set(key, value);
    index += 1;
  }

  const personaPath = args.get("persona");
  if (!personaPath) {
    throw new Error("Usage: tsx src/clients/run-agent.ts --persona personas/<file>.json [--base-url http://localhost:3100] [--poll-ms 900]");
  }

  return {
    baseUrl: args.get("base-url") ?? process.env.SHELTER_BASE_URL ?? "http://localhost:3100",
    pollMs: Number(args.get("poll-ms") ?? process.env.SHELTER_POLL_MS ?? "900"),
    personaPath,
  };
}

function shouldChat(persona: PersonaScript, currentTick: number, lastChattedTick: number): boolean {
  const cooldown = persona.tuning.chatty >= 0.7 ? 4 : persona.tuning.chatty >= 0.45 ? 6 : 9;
  if (currentTick - lastChattedTick < cooldown) {
    return false;
  }
  return Math.random() < persona.tuning.chatty;
}

function formatAction(action: { type: string; taskId?: string }): string {
  return action.taskId ? `${action.type}:${action.taskId}` : action.type;
}

function compactError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const persona = await loadPersona(options.personaPath);
  const runtime = new AgentRuntime(options, persona);

  const shutdown = async () => {
    await runtime.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await runtime.run();
  await runtime.shutdown();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
