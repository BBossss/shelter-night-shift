import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AgentRole, PersonaProfile } from "../shared/types.js";

export interface PersonaTuning {
  claimBias: number;
  assistBias: number;
  scanBias: number;
  offRolePenalty: number;
  chatty: number;
}

export interface PersonaVoice {
  ready: string[];
  claim: string[];
  assist: string[];
  scan: string[];
  pressure: string[];
  success: string[];
  failure: string[];
  idle: string[];
}

export interface PersonaScript {
  name: string;
  role: AgentRole;
  profile: PersonaProfile;
  tuning: PersonaTuning;
  voice: PersonaVoice;
}

export async function loadPersona(personaPath: string): Promise<PersonaScript> {
  const absolutePath = resolve(personaPath);
  const content = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(content) as PersonaScript;

  validatePersona(parsed, absolutePath);
  return parsed;
}

function validatePersona(persona: PersonaScript, personaPath: string): void {
  if (!persona.name || !persona.role || !persona.profile) {
    throw new Error(`Invalid persona file: ${personaPath}`);
  }
}
