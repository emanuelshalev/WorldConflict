# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

World Conflict — a turn-based geopolitical simulation game. Fastify + TypeScript backend at the repo root (`src/`), React 19 + Vite frontend in `ui/` (separate package.json, separate `npm install`). SQLite via Prisma for save games. LLM integration (OpenAI / Gemini / Ollama) is optional — `src/agents/fallback.ts` provides algorithmic behavior when no LLM is configured.

## Commands

```bash
npm install && cd ui && npm install && cd ..   # first-time setup (two installs)
npx prisma db push                              # create/update dev.db (DATABASE_URL defaults to file:./dev.db)

npm run dev          # backend (tsx watch, port 8080) + frontend (Vite, port 5173) concurrently
npm run dev:api      # backend only
npm run dev:ui       # frontend only

npm run test                                    # all tests (vitest, backend only)
npx vitest run tests/core/turn.spec.ts          # single test file
npx vitest run -t "determinism"                 # tests matching name
npm run perf                                    # perf tests in tests/perf

npm run lint         # biome — backend src/ only
npm run lint:fix     # biome with auto-fix
cd ui && npm run lint  # eslint for the frontend (separate toolchain)

npm run build        # tsc (backend → dist/) + vite build (frontend)
```

Backend env vars go in `.env` at the root (loaded via dotenv): `OPENAI_API_KEY`, `GEMINI_API_KEY` / `GEMINI_API_KEY_PERSONAL`, `PORT`, `DATABASE_URL`.

## Architecture

### Determinism is a core invariant

The simulation engine (`src/core/`) must be fully deterministic: same seed + same actions → identical world state. All randomness goes through `SeededRandom` from `src/core/seed.ts`; per-turn seeds are derived via `combineSeed(worldSeed, turn)`. Never use `Math.random()` or wall-clock time inside `src/core/`. `tests/core/determinism.spec.ts` enforces this over 24-turn simulations — run it after any change to turn resolution.

### Layering

- `src/core/` — pure simulation engine, no I/O, no LLM calls. `TurnEngine.executeTurn(state, playerActions, aiIntents, decisionChoices)` clones the state (`structuredClone`) and runs phases: resolve crisis decisions → events (`events.ts` historical-pattern templates, some carrying player `PendingDecision`s) → belief updates → action resolution → war resolution → nuclear progression → economy/domestic → government dynamics (elections/coups/revolutions in `systems/government.ts`) → scoring → newspaper → game-over checks. Domain subsystems live in `src/core/systems/` (military, diplomacy, covert, nuclear, economy, stability, intelligence, government) and are all actively wired into the engine. `preview.ts` predicts action consequences for the UI without mutating state.
- `src/core/types.ts` — single source of truth for domain types, all defined as Zod schemas. `CountryProfileSchema` validates the static JSON files in `data/countries/`; `CountryStateSchema`/`WorldStateSchema` are the runtime state. Scenario era-overrides (`leaders`, `countryOverrides`) are validated by `ScenarioSchema` in `data-loader.ts`.
- **Asymmetric information is real**: each country holds `beliefs` (noisy estimates of others' strength/GDP/stability/nuclear progress, accuracy driven by intel vs counter-intel). The AI decides from beliefs, not ground truth, and the API returns a belief-filtered `playerView` (with uncertainty ranges) for foreign countries.
- `src/agents/fallback.ts` — `PersonalityAI`, the deterministic country AI: decisions weighted by personality traits, historical rivals/allies, red lines, leader style, regime constraints (e.g. democracies avoid wars before elections) and beliefs. `generateDeterministicIntents(world)` is what `POST /api/turn` uses. `llmClient.ts`/`advisorAgent.ts` serve only the advisor chat endpoint.
- `src/api/` — Fastify routes. `routes/game.ts` is stateless (loads from DB per request): `/new-game`, `/turn` (accepts `playerActions` + `decisions`), `/preview-action`, `/report/:saveId`, `/scenarios`, `/saves`, `/load/:saveId`.
- `src/infra/db.ts` — Prisma + better-sqlite3 adapter. World state is stored as a JSON string in the `SaveGame` row and re-validated with `WorldStateSchema` on load. `DATABASE_URL` must be set in `.env` (`file:./dev.db`).

### Frontend

`ui/src/store/gameStore.ts` (Zustand) holds the server payload (`worldState`, belief-filtered `playerView`, `pendingDecisions`, `score`, `gameOver`), the turn-phase state machine (`news → briefing → diplomacy → military → domestic → confirm`), pending actions (each with a server-fetched `ActionPreview`), and crisis decision choices sent with the turn commit. **Types are duplicated, not shared**: `gameStore.ts` re-declares the backend types — changing a backend schema means updating both. The map (`MapView.tsx`) renders real country polygons from `ui/public/world.geojson` (Natural Earth 110m, joined on the `ADM0_A3` property) with six choropleth layers, pulsing war borders, alliance/war lines, and nuclear/insurgency icons. `CountryDetailPanel` is the click-a-country dossier with quick actions; `CrisisDecisionModal` interrupts the briefing when `pendingDecisions` exist. Advisor chat responses are generated locally in `AdvisorModal.tsx`, not by the backend.

### Game data

Static data is JSON in `data/`: one rich profile per country in `data/countries/` (political system, real historical key events, rivals/allies/spheres, personality traits, red lines, internal divisions — validated by `CountryProfileSchema`), scenarios in `data/scenarios/` (`1960`, `1990`, `2025`) carrying era-accurate leaders, regime/nuclear/GDP overrides, relations and alliances. `src/core/data-loader.ts` merges profile + scenario into the initial `WorldState`. Playable countries are restricted to `TIER1_COUNTRIES` in `types.ts`.

### Simulation invariants & balance

- Wars use a single `frontline` (0–100, 50 = stalemate); ends at 85/15 or by exhaustion ceasefire.
- Nuclear: two-strike rule (2 consecutive successful strikes cripple a DEVELOPING program; TESTED+ is invulnerable); nuclear use → global embargo, possible retaliation chain → `NUCLEAR_HOLOCAUST` game over.
- Global tension has a per-turn rise cap (+8, +30 on war/nuclear shock) and decays 12%/turn toward a war-count-based floor — keep this when adding tension sources or it pins at 100.
- The player can be deposed (election loss, coup, revolution, assassination); term ends at turn 120. Score is 4×50 components drifting 15%/month toward situation-derived targets.

## Conventions

- ESM throughout (`"type": "module"`); backend imports use explicit `.js` extensions (`./types.js`) due to NodeNext resolution.
- Path aliases `@core`, `@agents`, `@api`, `@infra` exist in tsconfig/vitest config, but existing code uses relative imports — match the surrounding file.
- Backend is linted/formatted by Biome (2-space indent, 100-char lines); the UI uses its own ESLint config. Don't run Biome on `ui/`.
- Commit messages: conventional-commit style (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Design docs and project specs live in `dev_plan/` (`spec.md`, `agents_plan.md`, `PROGRESS.md`).
