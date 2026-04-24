# Balance Recap Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repeatable simulation, post-game recap, richer crises, better sample-agent coordination, and browser UI verification.

**Architecture:** Extend `GameEngine` with public recap/zone data and task history. Add a pure in-process simulator that drives the same agent decision surface as HTTP agents. Keep UI vanilla HTML/CSS/JS and render recap/balance data with safe DOM APIs.

**Tech Stack:** TypeScript ESM, Node built-in tests, Express, static browser UI, Playwright CLI screenshots.

---

## Chunk 1: Engine Recap and Zones

### Task 1: Recap data

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/server/game-engine.ts`
- Test: `tests/game-engine.test.ts`

- [ ] Write failing tests for recap task outcomes, role contribution, and zone pressure after failures.
- [ ] Implement `RoomRecap`, `ZoneStatus`, `TaskHistoryEntry`, and `AgentContribution`.
- [ ] Update task resolution/failure paths to record history and contribution.
- [ ] Expose recap and zones through `getPublicState()`.

### Task 2: Expanded task templates

**Files:**
- Modify: `src/server/game-engine.ts`

- [ ] Add at least four more task templates.
- [ ] Add simple follow-up spawning on failed high-pressure tasks.
- [ ] Keep max active tasks bounded for readability.

## Chunk 2: Simulation and Strategy

### Task 3: In-process simulator

**Files:**
- Create: `src/server/simulator.ts`
- Create: `src/clients/sample-personas.ts`
- Create: `src/clients/run-simulation.ts`
- Modify: `package.json`
- Test: `tests/simulator.test.ts`

- [ ] Write failing tests for `runBalanceSimulation(10)` report shape.
- [ ] Implement simulator using `GameEngine`, sample persona scripts, and `chooseAction()`.
- [ ] Add `npm run simulate`.

### Task 4: Strategy coordination

**Files:**
- Modify: `src/clients/strategy.ts`
- Test: `tests/strategy.test.ts`

- [ ] Write failing tests for critical assistance and low-pressure overcrowding avoidance.
- [ ] Tune scoring using task progress/countdown, assigned role coverage, teammate status, and room pressure.

## Chunk 3: UI Recap and QA

### Task 5: Recap/balance UI

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] Add zone status, recap, contribution, and key event panels.
- [ ] Keep DOM rendering safe.
- [ ] Ensure long agent names/chat lines do not break cards.

### Task 6: Browser validation

**Files:**
- Create screenshots under `output/playwright/` if browser automation can run.

- [ ] Start app from compiled JS.
- [ ] Capture desktop and mobile screenshots.
- [ ] Check WebSocket state and long text layout manually through snapshots/screenshots.
