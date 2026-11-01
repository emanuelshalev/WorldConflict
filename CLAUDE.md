# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

World Conflict — a turn-based geopolitical simulation game set in Nov 2026 (41 countries). Fastify + TypeScript backend at the repo root (`src/`), React 19 + Vite frontend in `ui/` (separate package.json, separate `npm install`). SQLite via Prisma for save games. Three modes: Flashpoint (12 turns, authored objective), Term (48, election/review finale), Legacy (120). LLMs are optional and tiered (ALGORITHMIC / KEY_DECISIONS / FULL_LLM) — `src/agents/fallback.ts` PersonalityAI drives every country by default. Requires Node ≥ 20.19.

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
npm run sim -- --mode TERM --scenario 2026 --countries USA,UKR --games 12 --policy smart,none
                                                # headless playtest harness (balance metrics)

npm run lint         # biome — backend src/ only
npm run lint:fix     # biome with auto-fix
cd ui && npm run lint  # eslint for the frontend (separate toolchain)

npm run build        # tsc (backend → dist/) + vite build (frontend)
```

Backend env vars go in `.env` at the root (loaded via dotenv): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` / `GEMINI_API_KEY_PERSONAL`, `LLM_PROVIDER`, `PORT`, `DATABASE_URL`, `CORS_ORIGINS`. Players normally bring their own LLM key via the in-game Settings.

## Architecture

### Determinism is a core invariant

The simulation engine (`src/core/`) must be fully deterministic: same seed + same actions → identical world state. All randomness goes through `SeededRandom` from `src/core/seed.ts`; per-turn seeds are derived via `combineSeed(worldSeed, turn)`. Never use `Math.random()` or wall-clock time inside `src/core/`. `tests/core/determinism.spec.ts` enforces this over 24-turn simulations — run it after any change to turn resolution.

### Layering

- `src/core/` — pure simulation engine, no I/O, no LLM calls. `TurnEngine.executeTurn(state, playerActions, aiIntents, decisionChoices)` clones the state (`structuredClone`) and runs phases: resolve crisis decisions (effects, injected actions, follow-ups) → world events (`events.ts`, AI-world only) + the drama director (`crises.ts`: ~30 player crisis templates, shocks, follow-ups, per-mode cadence, cooldowns) → belief updates → action resolution (player orders cost political capital / budget share, `costs.ts`) → wars → nuclear → economy/domestic/diplomatic drift/tension → government dynamics (elections; coups and revolutions are telegraphed to the player as crises first) → scoring + player turn report → newspaper (player-led headline) → game over (`objectives.ts`: conditions, early failure, stars). Domain subsystems live in `src/core/systems/`. `preview.ts` predicts action consequences without mutating state.
- `src/core/types.ts` — single source of truth for domain types, all defined as Zod schemas. `CountryProfileSchema` validates the static JSON files in `data/countries/`; `CountryStateSchema`/`WorldStateSchema` are the runtime state. Scenario era-overrides (`leaders`, `countryOverrides`) are validated by `ScenarioSchema` in `data-loader.ts`.
- **Asymmetric information is real**: each country holds `beliefs` (noisy estimates of others' strength/GDP/stability/nuclear progress, accuracy driven by intel vs counter-intel). The AI decides from beliefs, not ground truth, and the API returns a belief-filtered `playerView` (with uncertainty ranges) for foreign countries.
- `src/agents/fallback.ts` — `PersonalityAI`, the deterministic country AI: decisions weighted by personality traits, historical rivals/allies, red lines, leader style, regime constraints and beliefs. `strategist.ts` `planTurn(world, aiConfig)` is what `POST /api/turn` uses: it returns PersonalityAI intents, replacing selected countries' intents with validated LLM proposals per tier (fallback on any failure/timeout/budget cap). `usage.ts` meters tokens/cost (persisted per save in `SaveGame.llmUsage`). Providers: `llmClient.ts` (OpenAI, Gemini, Ollama, OpenAI-compatible `local`) and `providers/anthropic.ts` (official SDK).
- `src/api/` — Fastify routes. `routes/game.ts` is stateless (loads from DB per request): `/new-game` (mode, difficulty, flashpointId, daily), `/turn` (`playerActions`, `decisions`, optional `ai` tier config), `/preview-action`, `/report/:saveId`, `/scenarios` (+ flashpoints + daily), `/countries`, `/saves`, `/load/:saveId`, `DELETE /save/:saveId`. Payloads pass through `publicWorldState()` so foreign ground truth never reaches the client.
- `src/infra/db.ts` — Prisma + better-sqlite3 adapter. World state is stored as a JSON string in the `SaveGame` row and re-validated with `WorldStateSchema` on load. `DATABASE_URL` must be set in `.env` (`file:./dev.db`).

### Frontend

`ui/src/store/gameStore.ts` (Zustand) holds the server payload (`worldState`, belief-filtered `playerView`, `pendingDecisions`, `objectiveStatus`, `score`, `gameOver`), screen (`title | game`), pending orders (with server previews), crisis choices, AI-tier settings (localStorage) and usage, guest id (saves without an account). **Types are duplicated, not shared**: `gameStore.ts` re-declares the backend types — changing a backend schema means updating both. Screens: `TitleScreen` (mode → crisis/era → nation → take office), `Hud`, `Desk` (crisis cards with effect arrows + advisor-suggested orders + all orders + Execute), `Chronicle` (post-turn newspaper + "your month"), `EndScreen` (grade, stars, emoji grid, share card), `Drawers` (cabinet/world/chronicle/mission), `SettingsModal` (AI tiers, cost). The map (`MapView.tsx`) draws Natural Earth polygons (`ui/public/world.geojson`, `ADM0_A3`) on a tileless ocean with a colorblind-safe Relations default layer. Design tokens live in `ui/src/styles/wc.css`.

### Game data

Static data is JSON in `data/`: 41 country profiles in `data/countries/` (validated by `CountryProfileSchema`; Natural Earth codes, Palestine = `PSX`), scenarios in `data/scenarios/` (`1960`, `1990`, `2025`, `2026`) with era-accurate leaders, overrides, relations, blocs, starting wars, deployments and briefing lines, and 8 flashpoints in `data/flashpoints/` (`FlashpointSchema`: playable sides, setup, per-side objectives, scripted crises, debrief). `src/core/data-loader.ts` `newGame()` builds a session (mode, difficulty, flashpoint) and opens with a crisis. Simulated countries are `TIER1_COUNTRIES` in `types.ts`.

### Simulation invariants & balance

- Wars use a single `frontline` (0–100, 50 = stalemate); ends at 85/15 or by exhaustion ceasefire.
- Nuclear: two-strike rule (2 consecutive successful strikes cripple a DEVELOPING program; TESTED+ is invulnerable); nuclear use → global embargo, possible retaliation chain → `NUCLEAR_HOLOCAUST` game over.
- Global tension has a per-turn rise cap (+8, +30 on war/nuclear shock), AI-generated tension counts half, and it decays 26%/turn toward a war-count floor (min(60, 25+6×wars)). Target: median 45–70, ≤20% of months ≥80 — verify with `npm run sim` when adding tension sources.
- Relations drift 2%/month toward a structural equilibrium (alliances, rivalries, regime affinity). Ceasefires depend on exhaustion and who is winning.
- The player can be deposed (election loss, coup, revolution, assassination) but coups/revolutions are telegraphed first (`coup_plot` / `streets_boiling` crises). Sessions end at `world.maxTurns` (mode-dependent). Score is 4×50 components drifting 15%/month toward situation-derived targets.
- Balance targets (harness): smart 55–85% wins, none ≤20%, random 15–45%.

## Conventions

- ESM throughout (`"type": "module"`); backend imports use explicit `.js` extensions (`./types.js`) due to NodeNext resolution.
- Path aliases `@core`, `@agents`, `@api`, `@infra` exist in tsconfig/vitest config, but existing code uses relative imports — match the surrounding file.
- Backend is linted/formatted by Biome (2-space indent, 100-char lines); the UI uses its own ESLint config. Don't run Biome on `ui/`.
- Commit messages: conventional-commit style (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Design docs and project specs live in `dev_plan/` (`spec.md`, `reviews/` expert & persona reviews, `project_status.html` live status page). Public docs: `docs/` (SETUP, GAMEPLAY, ARCHITECTURE, API, DEVELOPMENT).
