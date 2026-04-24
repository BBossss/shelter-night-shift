# Alpha Hardening and Spectator UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the playable alpha and refresh the spectator UI while preserving the current single-room prototype.

**Architecture:** Keep `GameEngine` as the in-memory authority. Add small validation/config/test seams around it and convert the static UI to safe DOM rendering with richer public state.

**Tech Stack:** TypeScript ESM, Express, ws, Node built-in test runner via `tsx --test`, static HTML/CSS/JS, generated PNG asset.

---

## Chunk 1: Test and Validation Foundation

### Task 1: Add test runner and validation tests

**Files:**
- Modify: `package.json`
- Create: `tests/validation.test.ts`
- Create: `src/server/validation.ts`

- [ ] Write failing tests that import `validateRegisterAgentRequest`, `validateAgentAction`, `validateSecret`, and `validateChatText`.
- [ ] Run `npm test` and verify the tests fail because the validator module is missing.
- [ ] Implement the validator module with clear error messages.
- [ ] Run `npm test` and verify validation tests pass.

### Task 2: Add deterministic engine tests

**Files:**
- Modify: `src/server/game-engine.ts`
- Modify: `src/shared/types.ts`
- Create: `tests/game-engine.test.ts`

- [ ] Write failing tests for deterministic advancement and public task progress fields.
- [ ] Run `npm test` and verify failure on missing engine seam/public fields.
- [ ] Add `advanceForTesting(seconds)` and task progress/participant display fields.
- [ ] Run `npm test` and verify engine tests pass.

## Chunk 2: Server and Scenario Cleanup

### Task 3: Wire validation into routes

**Files:**
- Modify: `src/server/server.ts`

- [ ] Call validator helpers in register, join, state, act, chat, and leave routes.
- [ ] Keep existing HTTP status behavior: bad input returns 400, bad secret returns 401.
- [ ] Run `npm test` and `npm run build`.

### Task 4: Align scenario constants

**Files:**
- Modify: `src/server/game-engine.ts`
- Modify: `README.md`
- Modify: `docs/2026-04-23-shelter-night-shift-spec.md`

- [ ] Move duration/spawn/min-player values into named constants.
- [ ] Update docs to match the implementation.
- [ ] Run `npm run build`.

## Chunk 3: Spectator UI

### Task 5: Generate and place intro image

**Files:**
- Create: `public/assets/shelter-ops-intro.png`

- [ ] Generate one dashboard-oriented intro visual with imagegen.
- [ ] Move/copy the selected PNG into `public/assets/`.
- [ ] Reference it from the UI.

### Task 6: Replace unsafe rendering and improve layout

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] Replace string-template `innerHTML` for untrusted state with DOM node rendering.
- [ ] Add connection state and reconnect behavior.
- [ ] Show task progress, assigned participant names, status labels, and metrics bars.
- [ ] Preserve a first-screen dashboard experience.

## Chunk 4: Verification

### Task 7: Final checks

**Files:**
- All touched files

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run a short local smoke test if feasible without requiring external network.
- [ ] Inspect git diff for unrelated changes.
