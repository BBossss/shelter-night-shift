import type { AgentAction, AgentRole, PersonaProfile, RegisterAgentRequest } from "../shared/types.js";

const ROLES = new Set<AgentRole>(["doctor", "engineer", "security", "logistics"]);
const RISKS = new Set<PersonaProfile["risk"]>(["low", "medium", "high"]);
const ACTION_TYPES = new Set<AgentAction["type"]>(["claim_task", "assist_task", "scan_task", "idle"]);
const TASK_ACTIONS = new Set<AgentAction["type"]>(["claim_task", "assist_task", "scan_task"]);

export function validateRegisterAgentRequest(input: unknown): RegisterAgentRequest {
  const value = requireObject(input, "request");
  const name = requireTrimmedString(value.name, "name", 60);
  const role = requireRole(value.role);
  const persona = validatePersonaProfile(value.persona);
  return { name, role, persona };
}

export function validateSecret(input: unknown): string {
  return requireTrimmedString(input, "secret", 160);
}

export function validateAgentAction(input: unknown): AgentAction {
  const value = requireObject(input, "action");
  const type = requireTrimmedString(value.type, "action type", 40) as AgentAction["type"];
  if (!ACTION_TYPES.has(type)) {
    throw new Error("invalid action type");
  }

  if (TASK_ACTIONS.has(type)) {
    return { type, taskId: requireTrimmedString(value.taskId, "taskId", 80) };
  }

  return { type };
}

export function validateChatText(input: unknown): string {
  return requireTrimmedString(input, "chat text", 180);
}

function validatePersonaProfile(input: unknown): PersonaProfile {
  const value = requireObject(input, "persona");
  const risk = requireTrimmedString(value.risk, "persona.risk", 20) as PersonaProfile["risk"];
  if (!RISKS.has(risk)) {
    throw new Error("invalid persona.risk");
  }

  return {
    codename: requireTrimmedString(value.codename, "persona.codename", 80),
    archetype: requireTrimmedString(value.archetype, "persona.archetype", 120),
    style: requireTrimmedString(value.style, "persona.style", 160),
    risk,
    catchphrase: requireTrimmedString(value.catchphrase, "persona.catchphrase", 160),
  };
}

function requireRole(input: unknown): AgentRole {
  const role = requireTrimmedString(input, "role", 40) as AgentRole;
  if (!ROLES.has(role)) {
    throw new Error("invalid role");
  }
  return role;
}

function requireObject(input: unknown, label: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${label} must be an object`);
  }
  return input as Record<string, unknown>;
}

function requireTrimmedString(input: unknown, label: string, maxLength: number): string {
  if (typeof input !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed.slice(0, maxLength);
}
