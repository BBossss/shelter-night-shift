# Shelter Night Shift Spec

## Summary

Shelter Night Shift is a cooperative survival game inspired by the room-based, real-time, identity-driven loop of Agent Casino, but adapted into a crisis-management scenario. Four agents defend a shelter during a timed night shift by claiming and resolving crisis cards before core shelter metrics collapse.

This MVP focuses on one question: is task-based role coordination fun to watch and easy to understand?

## Product Goals

- Validate that role-based task assignment creates visible cooperation.
- Create a real-time room loop with rising pressure and clear win/lose outcomes.
- Preserve strong agent identity through fixed roles and event narration.
- Keep the first version runnable without external model APIs.

## Non-Goals

- No persistent progression.
- No user-authenticated multiplayer.
- No LLM-backed decision-making.
- No deep map navigation or inventory systems.
- No season/meta progression.

## MVP Experience

- One room named `night_shift_demo`.
- Four auto-registered agents: Doctor, Engineer, Security, Logistics.
- The room runs a single timed defense scenario.
- Crisis cards appear over time in shelter zones.
- Agents auto-claim work based on role fit and current pressure.
- Spectators watch the shelter metrics, active tasks, agent states, and event feed update in real time.
- The shift ends in victory if time expires before a collapse condition is reached.

## Core Systems

## Room Service

- Owns one active room instance.
- Exposes room snapshot over HTTP.
- Broadcasts room state and events over WebSocket.
- Supports resetting the demo room.

## Game Engine

- Maintains authoritative in-memory room state.
- Advances time once per second.
- Spawns crisis cards on a schedule.
- Resolves agent work.
- Applies failures and checks win/loss conditions.

## Agent Runtime

- Runs four heuristic bots.
- Each bot has a fixed role and current status.
- Bots decide one action at a time: claim a task, assist a task, or idle.

## Task System

- Supports four task types: `medical`, `engineering`, `security`, `logistics`.
- Each task has a zone, severity, countdown, recommended role, and failure effect.
- One agent can resolve a task alone; support reduces time.
- Failed tasks increase zone pressure and may trigger a follow-up crisis.
- Resolved and failed tasks are retained in recap history.

## Spectator UI

- Read-only browser panel.
- Shows room phase, countdown, metrics, tasks, agents, and event feed.
- Shows zone pressure, task recap, final metrics, and per-agent contribution.
- Offers a reset button to restart the simulation.

## Data Model

## Room

- `id`
- `name`
- `phase`: `lobby | active | success | failure`
- `remainingSeconds`
- `startedAt`

## Base

- `power`
- `infection`
- `order`

## Agent

- `id`
- `name`
- `role`
- `zone`
- `status`: `idle | moving | working | down`
- `currentTaskId`
- `busyUntilTick`

## Task

- `id`
- `type`
- `title`
- `zone`
- `severity`
- `countdown`
- `requiredRoleHint`
- `status`: `open | assigned | in_progress | resolved | failed`
- `assignedAgents`
- `failureEffect`

## Event

- `id`
- `tick`
- `kind`
- `message`

## Game Rules

- Shift duration: 120 seconds.
- New task spawn cadence starts at every 8 seconds and accelerates to every 5 seconds late-game.
- If `power <= 0`, `infection >= 100`, or `order <= 0`, the room fails immediately.
- If the timer reaches zero first, the room succeeds.
- Unresolved tasks tick down each second.
- When a task expires, its failure effect modifies base metrics and the task is removed.
- Bots prioritize:
  - tasks matching their role
  - highest severity
  - lowest remaining countdown

## Verification Criteria

- Server starts locally with one command.
- Browser can open and see live state updates without refresh.
- At least three task types appear during a run.
- Event feed shows claim, resolve, and failure events.
- Public task state shows visible progress and participant names.
- Multi-run simulation reports win rate, failure causes, task outcomes, and role contribution.
- A full run reaches either success or failure without crashing.
