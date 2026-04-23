import { randomUUID } from "node:crypto";

import type {
  AgentAction,
  AgentRole,
  AgentRoomView,
  AgentStatus,
  BaseMetrics,
  ChatMessage,
  EventEntry,
  FailureEffect,
  InternalTaskState,
  PersonaProfile,
  PublicAgentState,
  PublicRoomView,
  PublicTaskState,
  RegisterAgentRequest,
  RegisteredAgent,
  RoomState,
  TaskType,
  Zone,
} from "../shared/types.js";

const ROOM_DURATION_SECONDS = 120;
const MAX_EVENTS = 60;
const MAX_CHAT = 30;
const MIN_PLAYERS_TO_START = 4;
const ROLE_LABEL: Record<AgentRole, string> = {
  doctor: "医生",
  engineer: "工程师",
  security: "治安员",
  logistics: "后勤员",
};
const ZONE_LABEL: Record<Zone, string> = {
  infirmary: "医务室",
  generator: "机房",
  gate: "大门",
  warehouse: "仓库",
  quarters: "宿舍区",
};

interface TaskTemplate {
  title: string;
  publicSummary: string;
  zone: Zone;
  requiredRoleHint: AgentRole;
  failureEffect: FailureEffect;
}

const TASK_LIBRARY: Record<TaskType, TaskTemplate[]> = {
  medical: [
    {
      title: "紧急分诊伤员",
      publicSummary: "有多名伤者等待处理，现场秩序开始变差。",
      zone: "infirmary",
      requiredRoleHint: "doctor",
      failureEffect: { infection: 10, order: -6 },
    },
    {
      title: "控制高热扩散",
      publicSummary: "宿舍区疑似出现传染性发热，病因不明。",
      zone: "quarters",
      requiredRoleHint: "doctor",
      failureEffect: { infection: 14 },
    },
  ],
  engineering: [
    {
      title: "修复发电机波动",
      publicSummary: "机房电流波动异常，照明闪烁。",
      zone: "generator",
      requiredRoleHint: "engineer",
      failureEffect: { power: -16, order: -4 },
    },
    {
      title: "恢复供水压力",
      publicSummary: "供水系统开始掉压，多个区域缺水。",
      zone: "warehouse",
      requiredRoleHint: "engineer",
      failureEffect: { infection: 8, power: -8 },
    },
  ],
  security: [
    {
      title: "平息配给骚乱",
      publicSummary: "配给区有人群冲突，局势正在升级。",
      zone: "quarters",
      requiredRoleHint: "security",
      failureEffect: { order: -18 },
    },
    {
      title: "封堵大门缺口",
      publicSummary: "大门外围出现破口，可能有外来威胁。",
      zone: "gate",
      requiredRoleHint: "security",
      failureEffect: { order: -12, infection: 6 },
    },
  ],
  logistics: [
    {
      title: "重新调配医疗箱",
      publicSummary: "医疗物资分布失衡，医务室即将断供。",
      zone: "warehouse",
      requiredRoleHint: "logistics",
      failureEffect: { infection: 7, order: -5 },
    },
    {
      title: "补充备用电池",
      publicSummary: "机房备用电源见底，需要立即补货。",
      zone: "generator",
      requiredRoleHint: "logistics",
      failureEffect: { power: -12 },
    },
  ],
};

export class GameEngine {
  private timer: NodeJS.Timeout | null = null;
  private taskCounter = 0;
  private eventCounter = 0;
  private chatCounter = 0;
  private state = this.createInitialState();

  start(): void {
    this.stop();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  registerAgent(input: RegisterAgentRequest): { agentId: string; secret: string } {
    const agentId = `agent_${randomUUID().slice(0, 8)}`;
    const secret = `sns_${randomUUID().replaceAll("-", "")}`;
    const startZone: Record<AgentRole, Zone> = {
      doctor: "infirmary",
      engineer: "generator",
      security: "gate",
      logistics: "warehouse",
    };

    const agent: RegisteredAgent = {
      id: agentId,
      secret,
      name: input.name,
      role: input.role,
      joined: false,
      zone: startZone[input.role],
      status: "idle",
      currentTaskId: null,
      persona: input.persona,
      intelTaskIds: [],
      scanCompleteTick: null,
      connectedAt: Date.now(),
      lastActionTick: -1,
    };
    this.state.agents.push(agent);
    this.log("system", `${ROLE_LABEL[agent.role]} ${agent.name} 已注册，等待加入房间。`);
    return { agentId, secret };
  }

  join(agentId: string): void {
    const agent = this.getAgent(agentId);
    agent.joined = true;
    agent.status = "idle";
    this.log("system", `${ROLE_LABEL[agent.role]} ${agent.name} 进入了避难所。`);
    this.maybeStartRoom();
  }

  leave(agentId: string): void {
    const agent = this.getAgent(agentId);
    agent.joined = false;
    agent.status = "offline";
    agent.currentTaskId = null;
    this.releaseAgentFromTask(agentId);
    this.log("system", `${ROLE_LABEL[agent.role]} ${agent.name} 离开了房间。`);
  }

  postChat(agentId: string, text: string): void {
    const agent = this.getAgent(agentId);
    const trimmed = text.trim().slice(0, 180);
    if (!trimmed) {
      return;
    }
    const message: ChatMessage = {
      id: `chat_${++this.chatCounter}`,
      tick: this.state.tick,
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      text: trimmed,
    };
    this.state.chat.unshift(message);
    this.state.chat = this.state.chat.slice(0, MAX_CHAT);
    this.log("chat", `${ROLE_LABEL[agent.role]} ${agent.name}：${trimmed}`);
  }

  resetRoom(): void {
    const preservedAgents = this.state.agents.map((agent) => ({
      ...agent,
      joined: false,
      status: "idle" as AgentStatus,
      currentTaskId: null,
      intelTaskIds: [],
      scanCompleteTick: null,
      lastActionTick: -1,
    }));
    this.taskCounter = 0;
    this.eventCounter = 0;
    this.chatCounter = 0;
    this.state = this.createInitialState();
    this.state.agents = preservedAgents;
    this.log("phase", "房间重置完成，等待 agent 重新加入。");
  }

  performAction(agentId: string, action: AgentAction): void {
    const agent = this.getAgent(agentId);
    if (!agent.joined) {
      throw new Error("agent 尚未加入房间");
    }
    if (this.state.phase !== "active") {
      throw new Error("当前不在进行中的对局阶段");
    }
    if (agent.status === "offline") {
      throw new Error("agent 当前离线");
    }
    if (agent.lastActionTick === this.state.tick) {
      throw new Error("每个 tick 只能提交一次动作");
    }

    switch (action.type) {
      case "idle":
        agent.lastActionTick = this.state.tick;
        return;
      case "scan_task":
        this.startScan(agent, action.taskId);
        break;
      case "claim_task":
        this.claimTask(agent, action.taskId);
        break;
      case "assist_task":
        this.assistTask(agent, action.taskId);
        break;
      default:
        throw new Error("不支持的动作");
    }

    agent.lastActionTick = this.state.tick;
  }

  getPublicState(): PublicRoomView {
    return {
      room: {
        id: this.state.id,
        name: this.state.name,
        phase: this.state.phase,
        remainingSeconds: this.state.remainingSeconds,
        tick: this.state.tick,
        minPlayersToStart: this.state.minPlayersToStart,
        base: { ...this.state.base },
      },
      agents: this.state.agents.map((agent) => this.toPublicAgent(agent)),
      tasks: this.state.tasks.map((task) => this.toPublicTask(task)),
      events: [...this.state.events],
      chat: [...this.state.chat],
    };
  }

  getAgentView(agentId: string): AgentRoomView {
    const agent = this.getAgent(agentId);
    return {
      room: {
        id: this.state.id,
        name: this.state.name,
        phase: this.state.phase,
        remainingSeconds: this.state.remainingSeconds,
        tick: this.state.tick,
        base: { ...this.state.base },
      },
      you: this.toPublicAgent(agent),
      teammates: this.state.agents.filter((item) => item.id !== agent.id).map((item) => this.toPublicAgent(item)),
      tasks: this.state.tasks.map((task) => {
        const roleKnows = task.requiredRoleHint === agent.role;
        const scanned = task.discoveredBy.includes(agent.id);
        return {
          ...this.toPublicTask(task),
          intelLevel: scanned ? "scanned" : roleKnows ? "role" : "public",
          exactSeverity: scanned || roleKnows ? task.exactSeverity : undefined,
          requiredRoleHint: scanned || roleKnows ? task.requiredRoleHint : undefined,
          failureEffectHint: scanned || roleKnows ? task.failureEffect : undefined,
        };
      }),
      recentEvents: [...this.state.events].slice(0, 20),
      recentChat: [...this.state.chat].slice(0, 12),
      allowedActions: ["claim_task", "assist_task", "scan_task", "idle"],
    };
  }

  authenticate(agentId: string, secret: string): boolean {
    const agent = this.state.agents.find((item) => item.id === agentId);
    return !!agent && agent.secret === secret;
  }

  private tick(): void {
    if (this.state.phase === "lobby") {
      this.maybeStartRoom();
      return;
    }
    if (this.state.phase !== "active") {
      return;
    }

    this.state.tick += 1;
    this.state.remainingSeconds = Math.max(0, this.state.remainingSeconds - 1);
    this.completeScans();
    this.spawnTasksIfNeeded();
    this.progressTasks();
    this.updateTaskCountdowns();
    this.checkOutcome();
  }

  private maybeStartRoom(): void {
    const joinedCount = this.state.agents.filter((agent) => agent.joined).length;
    if (this.state.phase === "lobby" && joinedCount >= this.state.minPlayersToStart) {
      this.state.phase = "active";
      this.state.tick = 0;
      this.state.remainingSeconds = ROOM_DURATION_SECONDS;
      this.log("phase", `已有 ${joinedCount} 名 agent 到齐，夜班开始。`);
    }
  }

  private createInitialState(): RoomState {
    return {
      id: "night_shift_alpha",
      name: "避难所夜班",
      phase: "lobby",
      remainingSeconds: ROOM_DURATION_SECONDS,
      tick: 0,
      minPlayersToStart: MIN_PLAYERS_TO_START,
      base: { power: 100, infection: 20, order: 100 },
      agents: [],
      tasks: [],
      events: [],
      chat: [],
    };
  }

  private spawnTasksIfNeeded(): void {
    const spawnEvery = this.state.remainingSeconds <= 50 ? 5 : 8;
    if (this.state.tick === 1 || this.state.tick % spawnEvery === 0) {
      const count = this.state.remainingSeconds <= 30 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        if (this.state.tasks.filter((task) => task.status !== "resolved" && task.status !== "failed").length >= 4) {
          return;
        }
        this.spawnTask();
      }
    }
  }

  private spawnTask(): void {
    const types = Object.keys(TASK_LIBRARY) as TaskType[];
    const bias =
      this.state.base.power < 50
        ? "engineering"
        : this.state.base.infection > 50
          ? "medical"
          : this.state.base.order < 50
            ? "security"
            : types[this.taskCounter % types.length];

    const options = TASK_LIBRARY[bias];
    const template = options[this.taskCounter % options.length];
    const exactSeverity = this.state.remainingSeconds <= 30 ? 3 : this.state.remainingSeconds <= 80 ? 2 : 1;
    const task: InternalTaskState = {
      id: `task_${++this.taskCounter}`,
      type: bias,
      title: template.title,
      publicSummary: template.publicSummary,
      zone: template.zone,
      severityBand: exactSeverity >= 3 ? "high" : exactSeverity === 2 ? "medium" : "low",
      countdown: 12 - exactSeverity,
      status: "open",
      assignedAgents: [],
      exactSeverity,
      requiredRoleHint: template.requiredRoleHint,
      progress: 0,
      progressNeeded: 10 + exactSeverity * 4,
      failureEffect: template.failureEffect,
      discoveredBy: [],
    };
    this.state.tasks.push(task);
    this.log("spawn", `${ZONE_LABEL[task.zone]}出现危机：${task.title}。`);
  }

  private startScan(agent: RegisteredAgent, taskId?: string): void {
    const task = this.getOpenTask(taskId);
    if (agent.status !== "idle") {
      throw new Error("当前状态不能扫描");
    }
    agent.status = "scanning";
    agent.currentTaskId = task.id;
    agent.scanCompleteTick = this.state.tick + 2;
    agent.zone = task.zone;
    this.log("scan", `${ROLE_LABEL[agent.role]} ${agent.name} 前往${ZONE_LABEL[task.zone]}侦测“${task.title}”。`);
  }

  private claimTask(agent: RegisteredAgent, taskId?: string): void {
    const task = this.getOpenTask(taskId);
    if (agent.status !== "idle") {
      throw new Error("当前状态不能接单");
    }
    if (task.status !== "open") {
      throw new Error("任务已被处理或不再可接");
    }
    task.status = "in_progress";
    task.assignedAgents.push(agent.id);
    agent.status = "working";
    agent.currentTaskId = task.id;
    agent.zone = task.zone;
    this.log("claim", `${ROLE_LABEL[agent.role]} ${agent.name} 接下了“${task.title}”。`);
  }

  private assistTask(agent: RegisteredAgent, taskId?: string): void {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task || task.status !== "in_progress") {
      throw new Error("只能支援进行中的任务");
    }
    if (agent.status !== "idle") {
      throw new Error("当前状态不能支援");
    }
    if (task.assignedAgents.includes(agent.id)) {
      throw new Error("你已在处理该任务");
    }
    task.assignedAgents.push(agent.id);
    agent.status = "working";
    agent.currentTaskId = task.id;
    agent.zone = task.zone;
    this.log("assist", `${ROLE_LABEL[agent.role]} ${agent.name} 正在支援“${task.title}”。`);
  }

  private completeScans(): void {
    for (const agent of this.state.agents) {
      if (agent.status !== "scanning" || agent.scanCompleteTick === null || agent.scanCompleteTick > this.state.tick) {
        continue;
      }
      const task = this.state.tasks.find((item) => item.id === agent.currentTaskId);
      if (task && !task.discoveredBy.includes(agent.id)) {
        task.discoveredBy.push(agent.id);
        this.log("scan", `${ROLE_LABEL[agent.role]} ${agent.name} 完成侦测：${task.title} 更适合由${ROLE_LABEL[task.requiredRoleHint]}处理。`);
      }
      agent.status = "idle";
      agent.currentTaskId = null;
      agent.scanCompleteTick = null;
    }
  }

  private progressTasks(): void {
    for (const task of this.state.tasks) {
      if (task.status !== "in_progress") {
        continue;
      }

      const assigned = task.assignedAgents
        .map((agentId) => this.state.agents.find((agent) => agent.id === agentId))
        .filter((agent): agent is RegisteredAgent => !!agent && agent.joined);

      if (assigned.length === 0) {
        task.status = "open";
        continue;
      }

      const tickProgress = assigned.reduce((total, agent) => {
        const roleBonus = agent.role === task.requiredRoleHint ? 3 : 1;
        return total + roleBonus;
      }, 0);
      task.progress += tickProgress;

      if (task.progress >= task.progressNeeded) {
        task.status = "resolved";
        for (const agent of assigned) {
          agent.status = "idle";
          agent.currentTaskId = null;
        }
        this.log(
          "resolve",
          `${task.title} 已解决，参与者：${assigned.map((agent) => `${ROLE_LABEL[agent.role]} ${agent.name}`).join("、")}。`,
        );
      }
    }

    this.state.tasks = this.state.tasks.filter((task) => task.status !== "resolved");
  }

  private updateTaskCountdowns(): void {
    for (const task of this.state.tasks) {
      if (task.status === "resolved" || task.status === "failed") {
        continue;
      }
      task.countdown -= 1;
      if (task.countdown <= 0) {
        task.status = "failed";
        this.applyFailure(task.failureEffect);
        this.releaseAgentsFromTaskIds(task.assignedAgents);
        this.log("fail", `${task.title} 处理失败，避难所压力上升。`);
      }
    }
    this.state.tasks = this.state.tasks.filter((task) => task.status !== "failed");
  }

  private applyFailure(effect: FailureEffect): void {
    this.state.base = {
      power: this.clamp(this.state.base.power + (effect.power ?? 0)),
      infection: this.clamp(this.state.base.infection + (effect.infection ?? 0)),
      order: this.clamp(this.state.base.order + (effect.order ?? 0)),
    };
  }

  private checkOutcome(): void {
    if (this.state.base.power <= 0 || this.state.base.infection >= 100 || this.state.base.order <= 0) {
      this.state.phase = "failure";
      this.log("phase", "天亮前避难所失守。");
      return;
    }
    if (this.state.remainingSeconds <= 0) {
      this.state.phase = "success";
      this.log("phase", "天亮了，避难所成功撑过这一夜。");
    }
  }

  private getAgent(agentId: string): RegisteredAgent {
    const agent = this.state.agents.find((item) => item.id === agentId);
    if (!agent) {
      throw new Error("agent 不存在");
    }
    return agent;
  }

  private getOpenTask(taskId?: string): InternalTaskState {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("任务不存在");
    }
    return task;
  }

  private releaseAgentFromTask(agentId: string): void {
    for (const task of this.state.tasks) {
      task.assignedAgents = task.assignedAgents.filter((id) => id !== agentId);
      if (task.status === "in_progress" && task.assignedAgents.length === 0) {
        task.status = "open";
      }
    }
  }

  private releaseAgentsFromTaskIds(agentIds: string[]): void {
    for (const agentId of agentIds) {
      const agent = this.state.agents.find((item) => item.id === agentId);
      if (!agent) {
        continue;
      }
      agent.status = "idle";
      agent.currentTaskId = null;
      agent.scanCompleteTick = null;
    }
  }

  private toPublicAgent(agent: RegisteredAgent): PublicAgentState {
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      zone: agent.zone,
      status: agent.status,
      currentTaskId: agent.currentTaskId,
      joined: agent.joined,
      persona: agent.persona,
    };
  }

  private toPublicTask(task: InternalTaskState): PublicTaskState {
    return {
      id: task.id,
      title: task.title,
      publicSummary: task.publicSummary,
      type: task.type,
      zone: task.zone,
      severityBand: task.severityBand,
      countdown: task.countdown,
      status: task.status,
      assignedAgents: [...task.assignedAgents],
    };
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private log(kind: EventEntry["kind"], message: string): void {
    this.state.events.unshift({
      id: `event_${++this.eventCounter}`,
      tick: this.state.tick,
      kind,
      message,
    });
    this.state.events = this.state.events.slice(0, MAX_EVENTS);
  }
}
