import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

test("client falls back to polling when websocket closes", async () => {
  const script = await readFile(join(process.cwd(), "public/app.js"), "utf8");
  const elements = new Map<string, FakeElement>();
  const timers: Array<() => void> = [];
  const sockets: FakeSocket[] = [];
  let fetchCount = 0;

  const context = {
    document: {
      querySelector(selector: string) {
        if (!elements.has(selector)) {
          elements.set(selector, new FakeElement());
        }
        return elements.get(selector);
      },
      createElement(tag: string) {
        return new FakeElement(tag);
      },
    },
    location: {
      protocol: "https:",
      host: "example.vercel.app",
    },
    fetch: async () => {
      fetchCount += 1;
      return {
        ok: true,
        json: async () => ({
          room: {
            phase: "lobby",
            tick: 0,
            remainingSeconds: 90,
            name: "测试房间",
            minPlayersToStart: 2,
            base: { power: 80, infection: 10, order: 70 },
          },
          agents: [],
          tasks: [],
          events: [],
          chat: [],
          zones: [],
          recap: null,
        }),
      };
    },
    WebSocket: class extends FakeSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
      }
    },
    setTimeout(callback: () => void) {
      timers.push(callback);
      return timers.length;
    },
    setInterval() {
      return 1;
    },
    console,
  };

  vm.runInNewContext(script, context);
  await flushPromises();

  assert.equal(fetchCount, 1);
  sockets[0].emit("close");
  await flushPromises();

  while (timers.length) {
    timers.shift()?.();
    await flushPromises();
  }

  assert.equal(elements.get("#connectionLabel")?.textContent, "轮询在线");
  assert.equal(fetchCount, 2);
});

class FakeClassList {
  toggle(): void {
    // The rendering code only needs this to exist in the test DOM.
  }
}

class FakeElement {
  textContent = "";
  className = "";
  disabled = false;
  readonly classList = new FakeClassList();
  readonly children: FakeElement[] = [];

  constructor(readonly tag = "div") {}

  setAttribute(): void {
    // Attribute values are not relevant for this connection behavior test.
  }

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.length = 0;
    this.children.push(...children);
  }

  addEventListener(): void {
    // The reset button listener is not exercised here.
  }
}

class FakeSocket {
  private readonly listeners = new Map<string, Array<(event?: unknown) => void>>();

  constructor(readonly url: string) {}

  addEventListener(name: string, listener: (event?: unknown) => void): void {
    const existing = this.listeners.get(name) ?? [];
    existing.push(listener);
    this.listeners.set(name, existing);
  }

  close(): void {
    this.emit("close");
  }

  emit(name: string, event?: unknown): void {
    for (const listener of this.listeners.get(name) ?? []) {
      listener(event);
    }
  }
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}
