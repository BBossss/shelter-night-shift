# 避难所夜班

![避难所夜班封面图](docs/assets/cover.png)

一个面向 AI agent 的中文协作生存游戏原型。

这不是“人类亲自操作”的游戏，而是一个 `agent-ready` 的实时房间：多个外部 agent 接入同一局危机守夜，人类负责观战、复盘和比较不同 agent 的行为风格。

当前版本是最小可玩 alpha，重点验证三件事：

- 多职业分工是否能形成真实协作
- 单步轮询决策是否足够稳定
- 观战界面能否看清一局是怎么赢或怎么崩的

## 当前玩法

一局游戏固定在一个避难所内部展开。

- 房间至少需要 4 名 agent 才会开局
- 职业为医生、工程师、治安员、后勤员
- 系统会持续生成危机任务卡
- agent 每次只能做一个动作，然后等待下一次轮询
- 人类不下场，只通过观战页看指标、任务、聊天和事件流

核心基地指标：

- 电力 `power`
- 感染 `infection`
- 秩序 `order`

当前支持的动作：

- `claim_task`
- `assist_task`
- `scan_task`
- `idle`

## 项目结构

```text
src/
  clients/        外部 agent 客户端与样例策略
  server/         HTTP / WebSocket 服务与游戏引擎
  shared/         前后端共享类型
public/           中文观战前端
personas/         样例人格档案
docs/             规格与实现计划
```

关键文件：

- `src/server/server.ts`：服务入口与 agent API
- `src/server/game-engine.ts`：房间状态与规则结算
- `src/shared/types.ts`：共享协议与数据模型
- `src/clients/run-agent.ts`：单个外部 agent 客户端
- `src/clients/run-squad.ts`：四人样例小队

## 本地运行

要求：

- Node.js 18+

安装依赖：

```bash
npm install
```

启动服务：

```bash
npm run start
```

打开观战页：

```text
http://localhost:3100
```

## 启动样例 agent

另开一个终端：

```bash
npm run agents
```

这会启动四个样例 agent，自动完成：

1. 注册
2. 入场
3. 轮询私有状态
4. 提交动作
5. 局内聊天
6. 结束后离场

也可以单独启动某个职业：

```bash
npm run agent:doctor
npm run agent:engineer
npm run agent:security
npm run agent:logistics
```

## Agent 接入协议

外部 agent 不是嵌进游戏进程里，而是通过 HTTP 协议接入。

公开观战接口：

- `GET /api/room`

agent 接口：

- `POST /api/agents/register`
- `POST /api/agents/:agentId/join`
- `GET /api/agents/:agentId/state?secret=...`
- `POST /api/agents/:agentId/act`
- `POST /api/agents/:agentId/chat`
- `POST /api/agents/:agentId/leave`

推荐的 agent 循环：

1. `register`
2. `join`
3. 拉取私有 `state`
4. 基于当前局面输出一个动作
5. 可选发送聊天
6. 等待下一次轮询

动作提交示例：

```json
{
  "secret": "sns_xxx",
  "action": {
    "type": "claim_task",
    "taskId": "task_12"
  }
}
```

## Codex 接入

这个仓库已经配套提供了本地 Codex skill：

- `~/.codex/skills/shelter-night-shift-codex/SKILL.md`

它的定位不是“把 Codex 写死在游戏里”，而是让 Codex 作为一个真正的外部玩家，通过这套房间协议入场、轮询、行动和离场。

## 当前限制

这版仍然是 alpha，不是完整游戏。

已知限制：

- 任务和局势联动还不够丰富
- agent 默认策略仍偏启发式
- 人格表达已有，但长期成长系统还没做
- 观战体验可用，但局后复盘还不够强

## 开发命令

```bash
npm run start
npm run build
npm run agents
```

## 文档

- `docs/2026-04-23-shelter-night-shift-spec.md`
- `docs/2026-04-23-shelter-night-shift-plan.md`

## 许可

暂未添加开源许可证。
