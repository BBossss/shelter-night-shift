import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/server/game-engine.js";
import type { AgentRole, PersonaProfile } from "../src/shared/types.js";

const persona: PersonaProfile = {
  codename: "Spec",
  archetype: "测试员",
  style: "精确",
  risk: "low",
  catchphrase: "记录完成。",
};

function register(engine: GameEngine, name: string, role: AgentRole) {
  return engine.registerAgent({ name, role, persona });
}

test("room starts after the minimum joined agents arrive", () => {
  const engine = new GameEngine();

  for (const [name, role] of [
    ["林医生", "doctor"],
    ["赵工程", "engineer"],
    ["周治安", "security"],
    ["钱后勤", "logistics"],
  ] as const) {
    const agent = register(engine, name, role);
    engine.join(agent.agentId);
  }

  assert.equal(engine.getPublicState().room.phase, "active");
});

test("public tasks expose progress and participant names", () => {
  const engine = new GameEngine();
  const doctor = register(engine, "林医生", "doctor");
  const engineer = register(engine, "赵工程", "engineer");
  const security = register(engine, "周治安", "security");
  const logistics = register(engine, "钱后勤", "logistics");

  for (const agent of [doctor, engineer, security, logistics]) {
    engine.join(agent.agentId);
  }

  engine.advanceForTesting(1);
  const task = engine.getAgentView(doctor.agentId).tasks.find((item) => item.type === "medical");
  assert.ok(task, "expected a spawned medical task");

  engine.performAction(doctor.agentId, { type: "claim_task", taskId: task.id });
  engine.advanceForTesting(1);

  const publicTask = engine.getPublicState().tasks.find((item) => item.id === task.id);
  assert.ok(publicTask, "expected claimed task to remain visible");
  assert.ok(publicTask.progress > 0);
  assert.ok(publicTask.progressNeeded > publicTask.progress);
  assert.deepEqual(publicTask.assignedAgentNames, ["林医生"]);

  engine.advanceForTesting(5);

  const resolvedState = engine.getPublicState();
  assert.equal(resolvedState.tasks.some((item) => item.id === task.id), false);
  assert.equal(resolvedState.agents.find((agent) => agent.id === doctor.agentId)?.status, "idle");
  assert.ok(resolvedState.events.some((event) => event.kind === "resolve" && event.message.includes(task.title)));
});

test("recap records task outcomes, role contribution, and zone pressure", () => {
  const engine = new GameEngine();
  const doctor = register(engine, "林医生", "doctor");
  const engineer = register(engine, "赵工程", "engineer");
  const security = register(engine, "周治安", "security");
  const logistics = register(engine, "钱后勤", "logistics");

  for (const agent of [doctor, engineer, security, logistics]) {
    engine.join(agent.agentId);
  }

  engine.advanceForTesting(1);
  const firstTask = engine.getAgentView(doctor.agentId).tasks[0];
  engine.performAction(doctor.agentId, { type: "claim_task", taskId: firstTask.id });
  engine.advanceForTesting(6);
  engine.advanceForTesting(8);

  const secondTask = engine.getPublicState().tasks[0];
  assert.ok(secondTask, "expected another active task after the first task clears");
  engine.advanceForTesting(secondTask.countdown);

  const state = engine.getPublicState();
  assert.ok(state.recap.tasksResolved >= 1);
  assert.ok(state.recap.tasksFailed >= 1);
  assert.ok(state.recap.agentContributions.some((item) => item.role === "doctor" && item.resolved >= 1 && item.progress > 0));
  assert.ok(state.zones.some((zone) => zone.pressure > 0));
  assert.ok(state.recap.keyEvents.some((event) => event.kind === "resolve"));
  assert.ok(state.recap.keyEvents.some((event) => event.kind === "fail"));
});
