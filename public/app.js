const phaseLabel = document.querySelector("#phaseLabel");
const connectionLabel = document.querySelector("#connectionLabel");
const introPanel = document.querySelector("#introPanel");
const metricsEl = document.querySelector("#metrics");
const roomSummaryEl = document.querySelector("#roomSummary");
const agentsEl = document.querySelector("#agents");
const tasksEl = document.querySelector("#tasks");
const eventsEl = document.querySelector("#events");
const chatEl = document.querySelector("#chat");
const zonesEl = document.querySelector("#zones");
const recapEl = document.querySelector("#recap");
const contributionsEl = document.querySelector("#contributions");
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

const TASK_STATUS_LABEL = {
  open: "待处理",
  in_progress: "处理中",
  resolved: "已解决",
  failed: "已失败",
};

const ZONE_CONDITION_LABEL = {
  stable: "稳定",
  strained: "紧张",
  critical: "临界",
};

function createElement(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

function replaceChildren(parent, children) {
  parent.replaceChildren(...children);
}

function label(value, map) {
  return map[value] ?? value;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function metricCard(labelText, value, max, tone = "neutral") {
  const percent = clampPercent((value / max) * 100);
  return createElement("div", { className: `metric ${tone}` }, [
    createElement("span", { text: labelText }),
    createElement("strong", { text: String(value) }),
    createElement("div", { className: "meter", attrs: { "aria-hidden": "true" } }, [
      createElement("i", { attrs: { style: `width: ${percent}%` } }),
    ]),
  ]);
}

function render(state) {
  const room = state.room;
  const active = room.phase === "active";
  phaseLabel.textContent = `${label(room.phase, PHASE_LABEL)} · T${room.tick} · 剩余 ${room.remainingSeconds} 秒`;
  introPanel.classList.toggle("is-compact", active);

  replaceChildren(metricsEl, [
    metricCard("电力", room.base.power, 100, room.base.power < 35 ? "danger" : "neutral"),
    metricCard("感染", room.base.infection, 100, room.base.infection > 65 ? "danger" : "neutral"),
    metricCard("秩序", room.base.order, 100, room.base.order < 35 ? "danger" : "neutral"),
    metricCard("危机数", state.tasks.length, 4, state.tasks.length > 3 ? "warning" : "neutral"),
  ]);

  renderRoomSummary(state);
  renderAgents(state.agents);
  renderTasks(state.tasks);
  renderEvents(state.events);
  renderChat(state.chat);
  renderZones(state.zones ?? []);
  renderRecap(state.recap);
}

function renderRoomSummary(state) {
  const joinedCount = state.agents.filter((agent) => agent.joined).length;
  replaceChildren(roomSummaryEl, [
    createElement("div", { className: "summary-list" }, [
      summaryRow("房间", state.room.name),
      summaryRow("状态", label(state.room.phase, PHASE_LABEL)),
      summaryRow("已加入", `${joinedCount}/${state.agents.length}`),
      summaryRow("开局阈值", `至少 ${state.room.minPlayersToStart} 名`),
    ]),
  ]);
}

function summaryRow(name, value) {
  return createElement("div", { className: "summary-row" }, [
    createElement("span", { text: name }),
    createElement("strong", { text: value }),
  ]);
}

function renderAgents(agents) {
  if (!agents.length) {
    replaceChildren(agentsEl, [empty("还没有 agent 注册。")]);
    return;
  }

  replaceChildren(
    agentsEl,
    agents.map((agent) =>
      createElement("article", { className: `card agent-card status-${agent.status}` }, [
        createElement("div", { className: "row" }, [
          createElement("strong", { text: agent.name }),
          createElement("span", { className: `pill role-${agent.role}`, text: label(agent.role, ROLE_LABEL) }),
        ]),
        createElement("p", { className: "codename", text: agent.persona.codename }),
        meta(`人格：${agent.persona.archetype}`),
        meta(`风格：${agent.persona.style}`),
        meta(`区域：${label(agent.zone, ZONE_LABEL)}`),
        meta(`状态：${label(agent.status, STATUS_LABEL)}`),
        meta(`当前任务：${agent.currentTaskId ?? "无"}`),
      ]),
    ),
  );
}

function renderTasks(tasks) {
  if (!tasks.length) {
    replaceChildren(tasksEl, [empty("当前没有危机。")]);
    return;
  }

  replaceChildren(
    tasksEl,
    tasks.map((task) => {
      const progress = task.progressNeeded > 0 ? clampPercent((task.progress / task.progressNeeded) * 100) : 0;
      return createElement("article", { className: `card task-card severity-${task.severityBand}` }, [
        createElement("div", { className: "row" }, [
          createElement("strong", { text: task.title }),
          createElement("span", { className: "pill", text: label(task.severityBand, SEVERITY_LABEL) }),
        ]),
        meta(`${label(task.type, TASK_TYPE_LABEL)} · ${label(task.zone, ZONE_LABEL)} · ${label(task.status, TASK_STATUS_LABEL)}`),
        createElement("p", { className: "task-summary", text: task.publicSummary }),
        createElement("div", { className: "progress-line" }, [
          createElement("span", { text: `倒计时 ${task.countdown}s` }),
          createElement("span", { text: `${task.progress}/${task.progressNeeded}` }),
        ]),
        createElement("div", { className: "meter task-meter", attrs: { "aria-label": `任务进度 ${Math.round(progress)}%` } }, [
          createElement("i", { attrs: { style: `width: ${progress}%` } }),
        ]),
        meta(`处理者：${task.assignedAgentNames.length ? task.assignedAgentNames.join("、") : "暂无"}`),
      ]);
    }),
  );
}

function renderEvents(events) {
  if (!events.length) {
    replaceChildren(eventsEl, [empty("还没有事件。")]);
    return;
  }

  replaceChildren(
    eventsEl,
    events.map((event) =>
      createElement("div", { className: `event kind-${event.kind}` }, [
        createElement("span", { className: "tick", text: `T${event.tick}` }),
        createElement("span", { text: event.message }),
      ]),
    ),
  );
}

function renderChat(chat) {
  if (!chat.length) {
    replaceChildren(chatEl, [empty("还没有聊天消息。")]);
    return;
  }

  replaceChildren(
    chatEl,
    chat.map((message) =>
      createElement("article", { className: "chat-card" }, [
        createElement("div", { className: "row" }, [
          createElement("strong", { text: message.agentName }),
          createElement("span", { className: `pill role-${message.role}`, text: label(message.role, ROLE_LABEL) }),
        ]),
        createElement("p", { className: "chat-text", text: message.text }),
      ]),
    ),
  );
}

function renderZones(zones) {
  if (!zones.length) {
    replaceChildren(zonesEl, [empty("暂无区域压力数据。")]);
    return;
  }

  replaceChildren(
    zonesEl,
    zones.map((zone) =>
      createElement("article", { className: `zone-row condition-${zone.condition}` }, [
        createElement("div", { className: "progress-line" }, [
          createElement("strong", { text: label(zone.zone, ZONE_LABEL) }),
          createElement("span", { text: label(zone.condition, ZONE_CONDITION_LABEL) }),
        ]),
        createElement("div", { className: "meter zone-meter", attrs: { "aria-label": `${label(zone.zone, ZONE_LABEL)}压力 ${zone.pressure}%` } }, [
          createElement("i", { attrs: { style: `width: ${clampPercent(zone.pressure)}%` } }),
        ]),
      ]),
    ),
  );
}

function renderRecap(recap) {
  if (!recap) {
    replaceChildren(recapEl, [empty("暂无复盘数据。")]);
    replaceChildren(contributionsEl, [empty("暂无贡献数据。")]);
    return;
  }

  replaceChildren(recapEl, [
    createElement("div", { className: "summary-list" }, [
      summaryRow("结局", label(recap.phase, PHASE_LABEL)),
      summaryRow("失败原因", recap.failureCause ?? "无"),
      summaryRow("解决/失败", `${recap.tasksResolved}/${recap.tasksFailed}`),
      summaryRow("最终指标", `电力 ${recap.finalBase.power} · 感染 ${recap.finalBase.infection} · 秩序 ${recap.finalBase.order}`),
    ]),
    createElement("div", { className: "history-list" }, recap.taskHistory.slice(0, 6).map(renderTaskHistory)),
  ]);

  replaceChildren(
    contributionsEl,
    recap.agentContributions.length
      ? recap.agentContributions.map((item) =>
          createElement("article", { className: "contribution-card" }, [
            createElement("div", { className: "row" }, [
              createElement("strong", { text: item.name }),
              createElement("span", { className: `pill role-${item.role}`, text: label(item.role, ROLE_LABEL) }),
            ]),
            meta(`解决 ${item.resolved} · 失败触达 ${item.failedTouched}`),
            meta(`接单 ${item.claims} · 支援 ${item.assists} · 侦测 ${item.scans}`),
            createElement("div", { className: "progress-line" }, [
              createElement("span", { text: "贡献进度" }),
              createElement("span", { text: String(item.progress) }),
            ]),
          ]),
        )
      : [empty("暂无贡献数据。")],
  );
}

function renderTaskHistory(task) {
  return createElement("div", { className: `history-item history-${task.status}` }, [
    createElement("span", { className: "tick", text: `T${task.tick}` }),
    createElement("div", {}, [
      createElement("strong", { text: task.title }),
      meta(`${label(task.status, TASK_STATUS_LABEL)} · ${label(task.type, TASK_TYPE_LABEL)} · ${label(task.zone, ZONE_LABEL)}`),
      meta(`参与者：${task.assignedAgentNames.length ? task.assignedAgentNames.join("、") : "无人"}`),
    ]),
  ]);
}

function meta(text) {
  return createElement("div", { className: "meta", text });
}

function empty(text) {
  return createElement("div", { className: "empty", text });
}

function setConnection(status, text) {
  connectionLabel.className = `connection ${status}`;
  connectionLabel.textContent = text;
}

async function loadInitial() {
  const response = await fetch("/api/room");
  const state = await response.json();
  render(state);
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.host}`);
  setConnection("connecting", "连接中");

  socket.addEventListener("open", () => setConnection("online", "实时在线"));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "room_state") {
      render(message.payload);
    }
  });
  socket.addEventListener("close", () => {
    setConnection("offline", "重连中");
    setTimeout(connect, 1200);
  });
  socket.addEventListener("error", () => {
    setConnection("offline", "连接异常");
    socket.close();
  });
}

resetButton.addEventListener("click", async () => {
  resetButton.disabled = true;
  try {
    const response = await fetch("/api/room/reset", { method: "POST" });
    if (!response.ok) {
      throw new Error(`reset failed: ${response.status}`);
    }
    setConnection("online", "已重置");
  } catch {
    setConnection("offline", "重置失败");
  } finally {
    resetButton.disabled = false;
  }
});

loadInitial().catch(() => setConnection("offline", "加载失败"));
connect();
