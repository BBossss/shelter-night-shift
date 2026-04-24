# Alpha Hardening and Spectator UI Design

## Goal

Improve the alpha without changing its core shape: keep the single in-memory room, add testable rules and input validation, make the spectator page safer and easier to read, and add one generated UI intro visual for the product identity.

## Scope

- Add a minimal automated test loop for engine behavior and request validation.
- Move scenario constants into a small config surface so docs and implementation can agree.
- Add runtime validators for agent registration, secrets, actions, and chat input.
- Improve the spectator UI with safer DOM rendering, visible task progress, named participants, connection state, and a generated intro image.
- Keep persistence, auth accounts, multiple rooms, LLM decision-making, and deep game expansion out of this pass.

## Design

The game engine remains authoritative and in memory. A test-only/public advancement method will let tests run deterministic ticks without timers. Public task snapshots will expose progress and display-friendly participant names so the UI can explain cooperation rather than only listing task ids.

Server validation will live in `src/server/validation.ts`. Route handlers will call these helpers before touching the engine. This keeps `server.ts` readable and makes invalid payload behavior testable without binding an HTTP server.

The spectator UI will stop interpolating untrusted agent/chat strings through `innerHTML`. Rendering will use DOM node creation, which also makes the interface easier to enrich with progress bars, status pills, and connection state. The generated raster asset will be stored under `public/assets/` and used as a compact intro panel background/visual, not as a landing page that hides the operational dashboard.

## Testing

Use Node's built-in test runner through `tsx --test`. Tests will cover:

- Validation rejects malformed registration and actions.
- Engine starts after the configured minimum players join.
- A role-matched claim can resolve a task over deterministic ticks.
- Public task state exposes progress and participant display names.

## UI Direction

The visual direction is a utilitarian crisis operations console: dense, legible, dark, restrained, with warm warning accents and clear status hierarchy. The page remains a working spectator dashboard on first load.
