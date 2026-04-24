import type { AgentRole } from "../shared/types.js";

import type { PersonaScript } from "./persona-loader.js";

export const SAMPLE_PERSONAS: PersonaScript[] = [
  {
    name: "林医生",
    role: "doctor",
    profile: {
      codename: "白灯",
      archetype: "冷静分诊者",
      style: "短句、先稳住伤员",
      risk: "low",
      catchphrase: "先把呼吸稳住。",
    },
    tuning: { claimBias: 1.4, assistBias: 1.1, scanBias: 0.9, offRolePenalty: 1.4, chatty: 0 },
    voice: emptyVoice(),
  },
  {
    name: "赵工",
    role: "engineer",
    profile: {
      codename: "断路器",
      archetype: "设施抢修员",
      style: "先电力，后舒适",
      risk: "medium",
      catchphrase: "电不断，夜就没断。",
    },
    tuning: { claimBias: 1.5, assistBias: 1.2, scanBias: 0.8, offRolePenalty: 1.3, chatty: 0 },
    voice: emptyVoice(),
  },
  {
    name: "周队",
    role: "security",
    profile: {
      codename: "门栓",
      archetype: "秩序守门人",
      style: "压住恐慌和入口",
      risk: "medium",
      catchphrase: "门还在，人心就还在。",
    },
    tuning: { claimBias: 1.5, assistBias: 1.3, scanBias: 0.8, offRolePenalty: 1.2, chatty: 0 },
    voice: emptyVoice(),
  },
  {
    name: "阿宁",
    role: "logistics",
    profile: {
      codename: "末班车",
      archetype: "机动军需官",
      style: "快、实用、越乱越能顶住",
      risk: "high",
      catchphrase: "东西能动，人就还有救。",
    },
    tuning: { claimBias: 1.6, assistBias: 1.5, scanBias: 1.1, offRolePenalty: 1.1, chatty: 0 },
    voice: emptyVoice(),
  },
];

export function samplePersonaByRole(role: AgentRole): PersonaScript {
  const persona = SAMPLE_PERSONAS.find((item) => item.role === role);
  if (!persona) {
    throw new Error(`missing sample persona for ${role}`);
  }
  return persona;
}

function emptyVoice(): PersonaScript["voice"] {
  return {
    ready: [],
    claim: [],
    assist: [],
    scan: [],
    pressure: [],
    success: [],
    failure: [],
    idle: [],
  };
}
