# Shelter Night Shift Implementation Plan

## Requirements Summary

- Build a minimal runnable MVP in `/Users/huangruibin/repos/shelter-night-shift`.
- Keep the first version self-contained and runnable without external services.
- Validate the cooperative room loop through automated role-based bots and a spectator UI.

## Acceptance Criteria

- `npm install` succeeds in the project directory.
- `npm run dev` starts a local server.
- `GET /api/room` returns a structured room snapshot.
- WebSocket clients receive periodic room updates.
- The browser UI renders metrics, tasks, agents, and events from live data.
- Resetting the room starts a fresh simulation.
- The project runs through a complete match without unhandled exceptions.

## Implementation Steps

1. Create Node/TypeScript project scaffolding with scripts, compiler config, and public asset structure.
2. Implement shared game types and deterministic room initialization.
3. Implement in-memory game engine with:
   - per-second tick loop
   - task spawning
   - bot decisions
   - task resolution
   - win/loss checks
4. Build HTTP and WebSocket server endpoints for:
   - room snapshot
   - room reset
   - live room broadcasts
5. Build a minimal spectator UI in `public/` that:
   - fetches initial state
   - subscribes to live updates
   - renders all major systems clearly
6. Install dependencies, run the MVP locally, fix defects, and document the run result in the final handoff.

## Risks and Mitigations

- Risk: the simulation is visually busy but unreadable.
  Mitigation: keep the UI focused on five panels only: status, metrics, agents, tasks, events.

- Risk: bot behavior looks random or uncooperative.
  Mitigation: use simple deterministic role-first heuristics and event logging.

- Risk: the engine drifts into over-complexity.
  Mitigation: keep only one room, one scenario, one action loop, and no persistence beyond memory.

## Verification Steps

- Run `npm install`.
- Run `npm run dev`.
- Open the local UI and confirm live updates.
- Watch a full room lifecycle from active play to success/failure.
- Inspect the browser UI and API response for consistent state.

