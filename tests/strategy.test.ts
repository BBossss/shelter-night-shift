import test from "node:test";
import assert from "node:assert/strict";

import { chooseAction } from "../src/clients/strategy.js";
import type { AgentRoomView } from "../src/shared/types.js";
import type { PersonaScript } from "../src/clients/persona-loader.js";

const persona: PersonaScript = {
  name: "阿宁",
  role: "logistics",
  profile: {
    codename: "末班车",
    archetype: "机动军需官",
    style: "快、实用",
    risk: "high",
    catchphrase: "东西能动，人就还有救。",
  },
  tuning: {
    claimBias: 1.6,
    assistBias: 1.5,
    scanBias: 1.1,
    offRolePenalty: 1.1,
    chatty: 0,
  },
  voice: {
    ready: [],
    claim: [],
    assist: [],
    scan: [],
    pressure: [],
    success: [],
    failure: [],
    idle: [],
  },
};

test("strategy supports a critical in-progress task before claiming routine work", () => {
  const decision = chooseAction(makeState(), persona);

  assert.deepEqual(decision.action, { type: "assist_task", taskId: "task_critical" });
});

test("strategy avoids overcrowding low-pressure in-progress tasks", () => {
  const state = makeState();
  state.tasks = [
    {
      id: "task_crowded",
      title: "低压支援",
      publicSummary: "已经有人处理。",
      type: "medical",
      zone: "infirmary",
      severityBand: "low",
      countdown: 9,
      status: "in_progress",
      assignedAgents: ["agent_a", "agent_b"],
      assignedAgentNames: ["A", "B"],
      progress: 8,
      progressNeeded: 12,
      intelLevel: "public",
    },
    {
      id: "task_logistics",
      title: "补给短缺",
      publicSummary: "仓库需要调配。",
      type: "logistics",
      zone: "warehouse",
      severityBand: "medium",
      countdown: 7,
      status: "open",
      assignedAgents: [],
      assignedAgentNames: [],
      progress: 0,
      progressNeeded: 16,
      intelLevel: "role",
      exactSeverity: 2,
      requiredRoleHint: "logistics",
    },
  ];

  const decision = chooseAction(state, persona);
  assert.deepEqual(decision.action, { type: "claim_task", taskId: "task_logistics" });
});

function makeState(): AgentRoomView {
  return {
    room: {
      id: "room",
      name: "避难所夜班",
      phase: "active",
      remainingSeconds: 35,
      tick: 40,
      base: { power: 42, infection: 48, order: 46 },
    },
    you: {
      id: "agent_me",
      name: "阿宁",
      role: "logistics",
      zone: "warehouse",
      status: "idle",
      currentTaskId: null,
      joined: true,
      persona: persona.profile,
    },
    teammates: [],
    tasks: [
      {
        id: "task_critical",
        title: "大门缺口",
        publicSummary: "倒计时很低。",
        type: "security",
        zone: "gate",
        severityBand: "high",
        countdown: 2,
        status: "in_progress",
        assignedAgents: ["agent_security"],
        assignedAgentNames: ["周治安"],
        progress: 3,
        progressNeeded: 22,
        intelLevel: "public",
      },
      {
        id: "task_logistics",
        title: "补给短缺",
        publicSummary: "仓库需要调配。",
        type: "logistics",
        zone: "warehouse",
        severityBand: "medium",
        countdown: 8,
        status: "open",
        assignedAgents: [],
        assignedAgentNames: [],
        progress: 0,
        progressNeeded: 16,
        intelLevel: "role",
        exactSeverity: 2,
        requiredRoleHint: "logistics",
      },
    ],
    recentEvents: [],
    recentChat: [],
    allowedActions: ["claim_task", "assist_task", "scan_task", "idle"],
  };
}
