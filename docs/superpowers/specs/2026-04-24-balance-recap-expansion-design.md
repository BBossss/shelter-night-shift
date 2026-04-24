# Balance, Recap, Task Expansion, Strategy, and Browser QA Design

## Goal

Move Shelter Night Shift from a playable alpha toward an evaluable beta slice by adding repeatable balance simulation, post-game recap, richer crisis rules, smarter sample-agent strategy, and browser-level UI checks.

## Scope

- Add an in-process simulator that can run 50-100 games without HTTP, timers, or browser involvement.
- Record a game recap in `GameEngine`: task success/failure counts, failure causes, key events, agent contribution, and final metrics.
- Expand the task system with more templates, zone pressure, and simple chained crisis effects.
- Upgrade sample strategy so agents avoid over-stacking on low-value work and support critical in-progress tasks.
- Add a recap/balance area to the spectator UI.
- Run browser screenshots for desktop/mobile and long-text states where the sandbox permits.

Out of scope: persistence, multiple rooms, auth accounts, LLM-backed agents, or a full campaign system.

## Architecture

`GameEngine` remains the authoritative runtime. It will maintain a `taskHistory`, `agentStats`, `zoneStatus`, and a computed `recap` inside the public room view. The simulator will live in `src/server/simulator.ts` and drive the same public agent-view/action interface that external agents use, using local persona scripts and `chooseAction()`.

Task expansion stays data-driven inside the current task library. Each task template can affect a zone and optionally define a follow-up crisis type on failure. This gives the game visible causal texture without introducing a separate scenario engine.

The UI will keep the live dashboard as the first screen and add compact recap/balance panels below the active dashboard. These panels should be useful during play and especially clear once the room reaches success/failure.

## Acceptance Criteria

- `npm run simulate -- --runs 50` prints a structured balance report with win rate, failure causes, average final metrics, task outcomes, and role contribution.
- `GET /api/room` includes recap and zone status.
- Ended games show a recap section in the spectator UI.
- Strategy tests verify agents support critical in-progress tasks and avoid overcrowding low-pressure tasks.
- Tests and build pass.
- Browser screenshots are captured for desktop and mobile if local browser automation can connect to the app.
