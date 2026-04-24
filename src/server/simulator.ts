import type { AgentRole, BaseMetrics, RoomRecap } from "../shared/types.js";
import { chooseAction } from "../clients/strategy.js";
import { SAMPLE_PERSONAS } from "../clients/sample-personas.js";
import type { PersonaScript } from "../clients/persona-loader.js";

import { GameEngine } from "./game-engine.js";

export interface SimulationOptions {
  runs: number;
  maxTicks?: number;
}

export interface BalanceReport {
  runs: number;
  successes: number;
  failures: number;
  winRate: number;
  failureCauses: Record<string, number>;
  averageFinalMetrics: BaseMetrics;
  taskOutcomes: {
    resolved: number;
    failed: number;
  };
  roleContribution: Array<{
    role: AgentRole;
    progress: number;
    resolved: number;
    claims: number;
    assists: number;
  }>;
  recommendations: string[];
}

interface RegisteredPersona {
  persona: PersonaScript;
  agentId: string;
}

export function runBalanceSimulation(options: SimulationOptions): BalanceReport {
  const runs = Math.max(1, Math.floor(options.runs));
  const maxTicks = options.maxTicks ?? 180;
  const recaps: RoomRecap[] = [];

  for (let index = 0; index < runs; index += 1) {
    recaps.push(runOneSimulation(index, maxTicks));
  }

  const successes = recaps.filter((recap) => recap.phase === "success").length;
  const failures = recaps.filter((recap) => recap.phase === "failure").length;
  const failureCauses: Record<string, number> = {};
  const totalMetrics: BaseMetrics = { power: 0, infection: 0, order: 0 };
  const roleTotals = new Map<AgentRole, { role: AgentRole; progress: number; resolved: number; claims: number; assists: number }>();

  let resolved = 0;
  let failed = 0;

  for (const recap of recaps) {
    resolved += recap.tasksResolved;
    failed += recap.tasksFailed;
    totalMetrics.power += recap.finalBase.power;
    totalMetrics.infection += recap.finalBase.infection;
    totalMetrics.order += recap.finalBase.order;
    if (recap.failureCause) {
      failureCauses[recap.failureCause] = (failureCauses[recap.failureCause] ?? 0) + 1;
    }
    for (const contribution of recap.agentContributions) {
      const total =
        roleTotals.get(contribution.role) ??
        {
          role: contribution.role,
          progress: 0,
          resolved: 0,
          claims: 0,
          assists: 0,
        };
      total.progress += contribution.progress;
      total.resolved += contribution.resolved;
      total.claims += contribution.claims;
      total.assists += contribution.assists;
      roleTotals.set(contribution.role, total);
    }
  }

  return {
    runs,
    successes,
    failures,
    winRate: successes / runs,
    failureCauses,
    averageFinalMetrics: {
      power: round(totalMetrics.power / runs),
      infection: round(totalMetrics.infection / runs),
      order: round(totalMetrics.order / runs),
    },
    taskOutcomes: { resolved, failed },
    roleContribution: [...roleTotals.values()].sort((left, right) => left.role.localeCompare(right.role)),
    recommendations: buildRecommendations(successes / runs, resolved, failed, failureCauses),
  };
}

function runOneSimulation(runIndex: number, maxTicks: number): RoomRecap {
  const engine = new GameEngine();
  const agents: RegisteredPersona[] = SAMPLE_PERSONAS.map((persona) => ({
    persona,
    ...engine.registerAgent({
      name: persona.name,
      role: persona.role,
      persona: persona.profile,
    }),
  }));

  for (const agent of agents) {
    engine.join(agent.agentId);
  }

  for (let tick = 0; tick < maxTicks; tick += 1) {
    const publicState = engine.getPublicState();
    if (publicState.room.phase === "success" || publicState.room.phase === "failure") {
      break;
    }

    for (const agent of agents) {
      if (tick < initialCoordinationDelay(runIndex)) {
        continue;
      }
      if (shouldSkipAction(runIndex, tick, agent.persona.role)) {
        continue;
      }
      const state = engine.getAgentView(agent.agentId);
      if (state.room.phase !== "active") {
        continue;
      }
      try {
        engine.performAction(agent.agentId, chooseAction(state, agent.persona).action);
      } catch {
        // Simulations should continue through rejected stale or crowded actions.
      }
    }

    engine.advanceForTesting(1);
  }

  return engine.getPublicState().recap;
}

function initialCoordinationDelay(runIndex: number): number {
  return runIndex % 5 === 0 ? 10 : runIndex % 7 === 0 ? 6 : 0;
}

function shouldSkipAction(runIndex: number, tick: number, role: AgentRole): boolean {
  const roleOffset: Record<AgentRole, number> = {
    doctor: 2,
    engineer: 5,
    security: 7,
    logistics: 11,
  };
  const cadence = 6 + ((runIndex + roleOffset[role]) % 5);
  return tick > 0 && (tick + runIndex + roleOffset[role]) % cadence === 0;
}

function buildRecommendations(winRate: number, resolved: number, failed: number, failureCauses: Record<string, number>): string[] {
  const recommendations: string[] = [];
  if (winRate < 0.35) {
    recommendations.push("胜率偏低：降低后期生成频率或提高同职能处理进度。");
  } else if (winRate > 0.8) {
    recommendations.push("胜率偏高：提高高压任务倒计时压力或增加连锁危机。");
  } else {
    recommendations.push("胜率处在可观察区间：适合继续用复盘数据调任务模板。");
  }
  if (failed > resolved) {
    recommendations.push("失败任务多于解决任务：建议提高 agent 对临界任务的支援权重。");
  }
  const topCause = Object.entries(failureCauses).sort((left, right) => right[1] - left[1])[0];
  if (topCause) {
    recommendations.push(`主要失败原因是 ${topCause[0]}：优先检查相关任务链和指标惩罚。`);
  }
  return recommendations;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
