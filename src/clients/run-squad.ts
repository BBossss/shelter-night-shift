import { spawn, type ChildProcess } from "node:child_process";
import process from "node:process";
import { resolve } from "node:path";

const PERSONAS = [
  "personas/doctor.json",
  "personas/engineer.json",
  "personas/security.json",
  "personas/logistics.json",
];

async function main(): Promise<void> {
  const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");
  const baseUrl = process.env.SHELTER_BASE_URL ?? "http://localhost:3100";
  const pollMs = process.env.SHELTER_POLL_MS ?? "900";

  const children = PERSONAS.map((personaPath) =>
    spawn(process.execPath, [tsxCli, "src/clients/run-agent.ts", "--persona", personaPath, "--base-url", baseUrl, "--poll-ms", pollMs], {
      cwd: process.cwd(),
      stdio: "inherit",
    }),
  );

  await waitForShutdown(children);
}

async function waitForShutdown(children: ChildProcess[]): Promise<void> {
  const stopChildren = () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
    }
  };

  process.on("SIGINT", stopChildren);
  process.on("SIGTERM", stopChildren);

  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolveChild, rejectChild) => {
          child.on("exit", (code, signal) => {
            if (code === 0 || signal === "SIGTERM" || signal === "SIGINT") {
              resolveChild();
              return;
            }
            rejectChild(new Error(`Agent process exited with code=${code} signal=${signal}`));
          });
          child.on("error", rejectChild);
        }),
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
