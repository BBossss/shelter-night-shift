import type { AgentAction, AgentRoomView, AgentTaskView } from "../shared/types.js";

import type { PersonaScript } from "./persona-loader.js";

const SEVERITY_SCORE: Record<AgentTaskView["severityBand"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export interface ChatDecision {
  reason: string;
  text: string;
}

export interface AgentDecision {
  action: AgentAction;
  chat?: ChatDecision;
}

export function chooseAction(state: AgentRoomView, persona: PersonaScript): AgentDecision {
  if (state.room.phase !== "active") {
    return { action: { type: "idle" } };
  }

  if (state.you.status !== "idle") {
    return {
      action: { type: "idle" },
      chat: chooseBusyChat(state, persona),
    };
  }

  const openTasks = state.tasks.filter((task) => task.status === "open");
  const inProgressTasks = state.tasks.filter((task) => task.status === "in_progress");

  const claimCandidate = scoreTasks(openTasks, state, persona, "claim")[0];
  const assistCandidate = scoreTasks(inProgressTasks, state, persona, "assist")[0];
  const scanCandidate = scoreTasks(
    openTasks.filter((task) => task.intelLevel === "public"),
    state,
    persona,
    "scan",
  )[0];

  if (claimCandidate && claimCandidate.score >= Math.max(assistCandidate?.score ?? -Infinity, scanCandidate?.score ?? -Infinity)) {
    return {
      action: { type: "claim_task", taskId: claimCandidate.task.id },
      chat: maybeTaskChat("claim", claimCandidate.task, state, persona),
    };
  }

  if (assistCandidate && assistCandidate.score >= Math.max(scanCandidate?.score ?? -Infinity, 1.5)) {
    return {
      action: { type: "assist_task", taskId: assistCandidate.task.id },
      chat: maybeTaskChat("assist", assistCandidate.task, state, persona),
    };
  }

  if (scanCandidate && scanCandidate.score >= 0.8) {
    return {
      action: { type: "scan_task", taskId: scanCandidate.task.id },
      chat: maybeTaskChat("scan", scanCandidate.task, state, persona),
    };
  }

  return {
    action: { type: "idle" },
    chat: chooseIdleChat(state, persona),
  };
}

function scoreTasks(tasks: AgentTaskView[], state: AgentRoomView, persona: PersonaScript, mode: "claim" | "assist" | "scan") {
  return tasks
    .map((task) => {
      const exactSeverity = task.exactSeverity ?? SEVERITY_SCORE[task.severityBand];
      const countdownPressure = Math.max(0, 12 - task.countdown) / 2;
      const roleHint = task.requiredRoleHint ?? inferredRole(task);
      const roleMatch = roleHint === persona.role ? 3 : 0;
      const offRolePenalty = roleHint && roleHint !== persona.role ? persona.tuning.offRolePenalty : 0;
      const crowdedPenalty = mode === "assist" ? Math.max(0, task.assignedAgents.length) * 2.2 : 0;
      const intelBoost = task.intelLevel === "scanned" ? 1.5 : task.intelLevel === "role" ? 1 : 0;
      const basePressure = roomPressureScore(state);

      let score = exactSeverity * 2 + countdownPressure + roleMatch + intelBoost + basePressure;

      if (mode === "claim") {
        score += persona.tuning.claimBias;
        if (task.intelLevel === "public" && roleHint !== persona.role) {
          score -= 6;
        }
      } else if (mode === "assist") {
        score += persona.tuning.assistBias - crowdedPenalty;
        if (task.assignedAgents.length >= 2) {
          score -= 5;
        }
        if (task.severityBand === "low" && task.assignedAgents.length >= 1) {
          score -= 4;
        }
      } else {
        score += persona.tuning.scanBias;
        score -= task.intelLevel !== "public" ? 4 : 0;
      }

      score -= offRolePenalty;

      return { task, score };
    })
    .sort((left, right) => right.score - left.score || left.task.countdown - right.task.countdown);
}

function roomPressureScore(state: AgentRoomView): number {
  const { power, infection, order } = state.room.base;
  const lowPower = power < 55 ? (55 - power) / 15 : 0;
  const highInfection = infection > 45 ? (infection - 45) / 15 : 0;
  const lowOrder = order < 55 ? (55 - order) / 15 : 0;
  return lowPower + highInfection + lowOrder;
}

function inferredRole(task: AgentTaskView) {
  switch (task.type) {
    case "medical":
      return "doctor";
    case "engineering":
      return "engineer";
    case "security":
      return "security";
    case "logistics":
      return "logistics";
    default:
      return undefined;
  }
}

function chooseBusyChat(state: AgentRoomView, persona: PersonaScript): ChatDecision | undefined {
  const urgent = isRoomUnderPressure(state);
  if (!urgent) {
    return undefined;
  }
  return {
    reason: "pressure",
    text: pickVoiceLine(persona.voice.pressure, persona.profile.catchphrase),
  };
}

function chooseIdleChat(state: AgentRoomView, persona: PersonaScript): ChatDecision | undefined {
  if (!isRoomUnderPressure(state)) {
    return undefined;
  }
  return {
    reason: "idle",
    text: pickVoiceLine(persona.voice.idle, persona.profile.catchphrase),
  };
}

function maybeTaskChat(kind: "claim" | "assist" | "scan", task: AgentTaskView, state: AgentRoomView, persona: PersonaScript): ChatDecision | undefined {
  if (!isRoomUnderPressure(state) && task.severityBand === "low") {
    return undefined;
  }
  return {
    reason: kind,
    text: `${pickVoiceLine(persona.voice[kind], persona.profile.catchphrase)} ${task.title}.`,
  };
}

function isRoomUnderPressure(state: AgentRoomView): boolean {
  return state.room.base.power < 50 || state.room.base.infection > 55 || state.room.base.order < 50 || state.tasks.length >= 3;
}

function pickVoiceLine(lines: string[], fallback: string): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? fallback;
}
