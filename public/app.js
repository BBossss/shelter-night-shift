const phaseLabel = document.querySelector("#phaseLabel");
const metricsEl = document.querySelector("#metrics");
const roomSummaryEl = document.querySelector("#roomSummary");
const agentsEl = document.querySelector("#agents");
const tasksEl = document.querySelector("#tasks");
const eventsEl = document.querySelector("#events");
const chatEl = document.querySelector("#chat");
const resetButton = document.querySelector("#resetButton");

const PHASE_LABEL = {
  lobby: "等待加入",
  active: "值守中",
  success: "守夜成功",
  failure: "守夜失败",
};

const ROLE_LABEL = {
  doctor: "医生",
  engineer: "工程师",
  security: "治安员",
  logistics: "后勤员",
};

const ZONE_LABEL = {
  infirmary: "医务室",
  generator: "机房",
  gate: "大门",
  warehouse: "仓库",
  quarters: "宿舍区",
};

const STATUS_LABEL = {
  idle: "空闲",
  working: "处理中",
  scanning: "侦测中",
  offline: "离线",
};

const TASK_TYPE_LABEL = {
  medical: "医疗",
  engineering: "工程",
  security: "治安",
  logistics: "后勤",
};

const SEVERITY_LABEL = {
  low: "低压",
  medium: "中压",
  high: "高压",
};

function metricCard(label, value, tone = "neutral") {
  return `
    <div class="metric ${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function render(state) {
  const room = state.room;
  phaseLabel.textContent = `${PHASE_LABEL[room.phase] ?? room.phase} · T${room.tick} · 剩余 ${room.remainingSeconds} 秒`;

  metricsEl.innerHTML = [
    metricCard("电力", room.base.power, room.base.power < 35 ? "danger" : "neutral"),
    metricCard("感染", room.base.infection, room.base.infection > 65 ? "danger" : "neutral"),
    metricCard("秩序", room.base.order, room.base.order < 35 ? "danger" : "neutral"),
    metricCard("危机数", state.tasks.length, state.tasks.length > 3 ? "warning" : "neutral"),
  ].join("");

  const joinedCount = state.agents.filter((agent) => agent.joined).length;
  roomSummaryEl.innerHTML = `
    <div class="card">
      <div class="meta">房间：${room.name}</div>
      <div class="meta">状态：${PHASE_LABEL[room.phase] ?? room.phase}</div>
      <div class="meta">已加入 agent：${joinedCount}/${state.agents.length}</div>
      <div class="meta">开局阈值：至少 ${room.minPlayersToStart} 名</div>
    </div>
  `;

  agentsEl.innerHTML = state.agents.length
    ? state.agents
        .map(
          (agent) => `
            <div class="card">
              <div class="row">
                <strong>${agent.name}</strong>
                <span>${ROLE_LABEL[agent.role] ?? agent.role}</span>
              </div>
              <div class="meta">代号：${agent.persona.codename}</div>
              <div class="meta">人格：${agent.persona.archetype}</div>
              <div class="meta">风格：${agent.persona.style}</div>
              <div class="meta">区域：${ZONE_LABEL[agent.zone] ?? agent.zone}</div>
              <div class="meta">状态：${STATUS_LABEL[agent.status] ?? agent.status}</div>
              <div class="meta">当前任务：${agent.currentTaskId ?? "无"}</div>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">还没有 agent 注册。</div>`;

  tasksEl.innerHTML = state.tasks.length
    ? state.tasks
        .map(
          (task) => `
            <div class="card">
              <div class="row">
                <strong>${task.title}</strong>
                <span>${SEVERITY_LABEL[task.severityBand] ?? task.severityBand}</span>
              </div>
              <div class="meta">${TASK_TYPE_LABEL[task.type] ?? task.type} · ${ZONE_LABEL[task.zone] ?? task.zone}</div>
              <div class="meta">${task.publicSummary}</div>
              <div class="meta">倒计时：${task.countdown} 秒</div>
              <div class="meta">状态：${task.status}</div>
              <div class="meta">处理者：${task.assignedAgents.length ? task.assignedAgents.join("、") : "暂无"}</div>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">当前没有危机。</div>`;

  eventsEl.innerHTML = state.events.length
    ? state.events
        .map(
          (event) => `
            <div class="event">
              <span class="tick">T${event.tick}</span>
              <span>${event.message}</span>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">还没有事件。</div>`;

  chatEl.innerHTML = state.chat.length
    ? state.chat
        .map(
          (message) => `
            <div class="chat-card">
              <div class="row">
                <strong>${message.agentName}</strong>
                <span>${ROLE_LABEL[message.role] ?? message.role}</span>
              </div>
              <div class="meta">${message.text}</div>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">还没有聊天消息。</div>`;
}

async function loadInitial() {
  const response = await fetch("/api/room");
  const state = await response.json();
  render(state);
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.host}`);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "room_state") {
      render(message.payload);
    }
  });
}

resetButton.addEventListener("click", async () => {
  await fetch("/api/room/reset", { method: "POST" });
});

loadInitial();
connect();
