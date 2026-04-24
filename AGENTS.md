# Repository Guidelines

## Project Structure & Module Organization
Core code lives in `src/`. Use `src/server/` for the Express and WebSocket server, room lifecycle, and game rules; `src/clients/` for external agent runtimes, API helpers, persona loading, and strategy code; and `src/shared/` for protocol types shared across server and clients. Static spectator UI assets live in `public/`. Sample agent personas are stored in `personas/*.json`. Keep product notes and specs in `docs/`, and treat `dist/` as build output only.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the server with `tsx watch` for local iteration.
- `npm run start` runs the server once on `http://localhost:3100`.
- `npm run build` compiles TypeScript into `dist/` and is the main validation step.
- `npm run agents` launches the four sample agents against the local room.
- `npm run agent:doctor` (or `agent:engineer`, `agent:security`, `agent:logistics`) runs a single persona for focused testing.

## Coding Style & Naming Conventions
This repository uses strict TypeScript with ESM imports and `.js` import suffixes in source files. Follow the existing style: 2-space indentation, double quotes, semicolons, and small focused modules. Prefer `camelCase` for variables and functions, `PascalCase` for classes and types, and kebab-case for documentation filenames. Keep shared contracts in `src/shared/types.ts` or nearby shared modules instead of duplicating shapes.

## Testing Guidelines
There is no committed automated test framework yet. Until one is added, treat `npm run build` as required for every change, then do a manual smoke test: start the server, run `npm run agents`, and verify the spectator page updates correctly. When adding tests later, place them beside the feature or under a dedicated `tests/` directory and name them after the unit under test, such as `game-engine.test.ts`.

## Commit & Pull Request Guidelines
Recent history uses short, imperative commit subjects such as `Add public README` and `Add repository cover image`. Follow that pattern, keep each commit focused, and avoid mixing gameplay, protocol, and UI changes without a reason. PRs should explain the gameplay or protocol impact, list validation steps, link relevant docs/issues, and include screenshots or short recordings for `public/` changes.

## Configuration Notes
Default local port is `3100`. Agent clients also respect `SHELTER_BASE_URL` and `SHELTER_POLL_MS`, so prefer environment variables over hard-coded endpoint changes when testing different rooms or polling behavior.
