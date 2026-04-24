export type RoomPhase = "lobby" | "active" | "success" | "failure";
export type AgentRole = "doctor" | "engineer" | "security" | "logistics";
export type AgentStatus = "idle" | "working" | "scanning" | "offline";
export type TaskType = "medical" | "engineering" | "security" | "logistics";
export type TaskStatus = "open" | "in_progress" | "resolved" | "failed";
export type Zone = "infirmary" | "generator" | "gate" | "warehouse" | "quarters";
export type ZoneCondition = "stable" | "strained" | "critical";

export interface BaseMetrics {
  power: number;
  infection: number;
  order: number;
}

export interface FailureEffect {
  power?: number;
  infection?: number;
  order?: number;
}

export interface PersonaProfile {
  codename: string;
  archetype: string;
  style: string;
  risk: "low" | "medium" | "high";
  catchphrase: string;
}

export interface RegisteredAgent {
  id: string;
  secret: string;
  name: string;
  role: AgentRole;
  joined: boolean;
  zone: Zone;
  status: AgentStatus;
  currentTaskId: string | null;
  persona: PersonaProfile;
  intelTaskIds: string[];
  scanCompleteTick: number | null;
  connectedAt: number;
  lastActionTick: number;
}

export interface PublicTaskState {
  id: string;
  title: string;
  publicSummary: string;
  type: TaskType;
  zone: Zone;
  severityBand: "low" | "medium" | "high";
  countdown: number;
  status: TaskStatus;
  assignedAgents: string[];
  assignedAgentNames: string[];
  progress: number;
  progressNeeded: number;
}

export interface ZoneStatus {
  zone: Zone;
  pressure: number;
  condition: ZoneCondition;
}

export interface TaskHistoryEntry {
  id: string;
  title: string;
  type: TaskType;
  zone: Zone;
  status: "resolved" | "failed";
  tick: number;
  assignedAgentNames: string[];
  failureEffect?: FailureEffect;
}

export interface AgentContribution {
  agentId: string;
  name: string;
  role: AgentRole;
  claims: number;
  assists: number;
  scans: number;
  resolved: number;
  failedTouched: number;
  progress: number;
}

export interface RoomRecap {
  phase: RoomPhase;
  failureCause: "power" | "infection" | "order" | null;
  tasksResolved: number;
  tasksFailed: number;
  taskHistory: TaskHistoryEntry[];
  agentContributions: AgentContribution[];
  keyEvents: EventEntry[];
  finalBase: BaseMetrics;
}

export interface InternalTaskState extends PublicTaskState {
  exactSeverity: number;
  requiredRoleHint: AgentRole;
  progress: number;
  progressNeeded: number;
  failureEffect: FailureEffect;
  discoveredBy: string[];
}

export interface ChatMessage {
  id: string;
  tick: number;
  agentId: string;
  agentName: string;
  role: AgentRole;
  text: string;
}

export interface EventEntry {
  id: string;
  tick: number;
  kind: "spawn" | "claim" | "assist" | "scan" | "resolve" | "fail" | "phase" | "chat" | "system";
  message: string;
}

export interface PublicAgentState {
  id: string;
  name: string;
  role: AgentRole;
  zone: Zone;
  status: AgentStatus;
  currentTaskId: string | null;
  joined: boolean;
  persona: PersonaProfile;
}

export interface RoomState {
  id: string;
  name: string;
  phase: RoomPhase;
  remainingSeconds: number;
  tick: number;
  minPlayersToStart: number;
  base: BaseMetrics;
  agents: RegisteredAgent[];
  tasks: InternalTaskState[];
  taskHistory: TaskHistoryEntry[];
  agentContributions: AgentContribution[];
  zones: ZoneStatus[];
  events: EventEntry[];
  chat: ChatMessage[];
}

export interface AgentTaskView extends PublicTaskState {
  exactSeverity?: number;
  requiredRoleHint?: AgentRole;
  failureEffectHint?: FailureEffect;
  intelLevel: "public" | "role" | "scanned";
}

export interface AgentRoomView {
  room: {
    id: string;
    name: string;
    phase: RoomPhase;
    remainingSeconds: number;
    tick: number;
    base: BaseMetrics;
  };
  you: PublicAgentState;
  teammates: PublicAgentState[];
  tasks: AgentTaskView[];
  recentEvents: EventEntry[];
  recentChat: ChatMessage[];
  allowedActions: AgentActionType[];
}

export interface PublicRoomView {
  room: {
    id: string;
    name: string;
    phase: RoomPhase;
    remainingSeconds: number;
    tick: number;
    minPlayersToStart: number;
    base: BaseMetrics;
  };
  agents: PublicAgentState[];
  tasks: PublicTaskState[];
  zones: ZoneStatus[];
  recap: RoomRecap;
  events: EventEntry[];
  chat: ChatMessage[];
}

export type AgentActionType = "claim_task" | "assist_task" | "scan_task" | "idle";

export interface AgentAction {
  type: AgentActionType;
  taskId?: string;
}

export interface RegisterAgentRequest {
  name: string;
  role: AgentRole;
  persona: PersonaProfile;
}
