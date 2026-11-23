# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository. Keep this file short and essential (under 200 lines); module-by-module detail lives in `docs/ARCHITECTURE.md`, read it on demand.

## Project

World Conflict, a turn-based geopolitical simulation game set in Nov 2026 (41 countries; also 1960, 1990 and Jan 2025 eras). Fastify + TypeScript backend at the repo root (`src/`), React 19 + Vite frontend in `ui/` (separate package.json, separate `npm install`). SQLite via Prisma for save games. Three modes: Flashpoint (12 turns, authored objective), Term (48, election/review finale), Legacy (120). LLMs are optional and tiered (ALGORITHMIC / KEY_DECISIONS / FULL_LLM); `src/agents/fallback.ts` PersonalityAI drives every country by default. Requires Node >= 20.19.

## Commands

```bash
npm run setup        # first-time setup: both installs, .env, SQLite or JSON-file saves
npx prisma db push   # (manual alternative) create/update dev.db (DATABASE_URL defaults to file:./dev.db)
npm run dev          # backend (tsx watch, :8080) + frontend (Vite, :5173); dev:api / dev:ui for one
npm run test         # all tests (vitest); timing tests in tests/perf run after the main suite
npx vitest run tests/core/turn.spec.ts   # single file; add -t "determinism" to match a name
npm run perf         # perf tests in tests/perf
npm run sim -- --mode TERM --scenario 2026 --countries USA,UKR --games 12 --policy smart,none
                     # headless playtest harness (balance metrics)
npm run bench:reveal # regenerate data/benchmarks/ (~15 min), commit it
npm run playtest:smoke   # UI smoke playtest (needs npm run dev)
npm run lint         # biome: backend src/ only; lint:fix auto-fixes
cd ui && npm run lint    # eslint for the frontend (separate toolchain)
npm run build        # tsc (backend to dist/) + vite build (frontend)

npm run verify                    # merge gate: tests, lints, build, balance bands, own servers, smoke, reveal, visual, finding guards
npm run verify -- --quick         # tests, lints, build and the regression registry check only
npm run verify -- --full          # adds the orders / world map acceptance scripts
npm run verify -- --changed       # suites and finding guards covering files changed since the branch base
npm run verify -- --update-visual # rewrite tests/visual/__screenshots__ after an intended UI change
npm run quality -- --iteration 3  # release gate scorecard from quality.json (devloop/kit/evaluate.mjs; --json, --record)
                                  # a full verify run records its result with the loop controller
node devloop/kit/loop.mjs status  # loop controller: stage, gates on the current code, what is owed
node devloop/kit/loop.mjs advance # next stage (refused when a gate is missing); record/check/override: devloop/method/controller.md
node devloop/kit/merge.mjs <branch>   # merge a work branch into dev/rc1-synthetic-loop (needs verify on the merge result)
node devloop/kit/publish.mjs          # fast-forward main and tag iter-N (needs verify on that commit)
node devloop/kit/status-refresh.mjs devloop/instances/world-conflict/status-protocol.json --tier T1
                                      # regenerate dev_plan/project_status.html by tier (devloop/method/status-page.md)
```

Backend env vars go in `.env` at the root (loaded via dotenv): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` / `GEMINI_API_KEY_PERSONAL`, `LLM_PROVIDER`, `PORT`, `DATABASE_URL`, `CORS_ORIGINS`, `WC_DAILY_DATE` (pins the daily crisis date; the verify gate sets it so guards never depend on the calendar). Players normally bring their own LLM key via the in-game Settings.

## Architecture

**Determinism is a core invariant.** The engine (`src/core/`) must be fully deterministic: same seed + same actions give an identical world state. All randomness goes through `SeededRandom` (`src/core/seed.ts`); per-turn seeds come from `combineSeed(worldSeed, turn)`. Never use `Math.random()` or wall-clock time inside `src/core/`. `tests/core/determinism.spec.ts` enforces it over 24-turn simulations: run it after any change to turn resolution.

Layers (module-by-module detail, routes, components and data in `docs/ARCHITECTURE.md`):

- `src/core/`: pure simulation engine, no I/O, no LLM calls. `TurnEngine.executeTurn(state, playerActions, aiIntents, decisionChoices)` clones the state and runs the phases (crisis decisions, events + drama director, beliefs, actions, wars, nuclear, economy/tension, government, scoring + report, newspaper, game over). Subsystems in `core/systems/`.
- `src/core/types.ts`: single source of truth for domain types, all Zod schemas (profiles in `data/countries/`, runtime `WorldState`). Foreign countries are seen only through noisy `beliefs` and a belief-filtered `playerView`; `publicWorldState()` keeps ground truth from the client (the reveal is the only exception).
- `src/agents/`: `fallback.ts` PersonalityAI (deterministic country AI); `strategist.ts` `planTurn` (what `POST /api/turn` uses: PersonalityAI intents, with selected countries replaced by validated LLM proposals per tier, falling back on any failure); `llmClient.ts`, `providers/anthropic.ts`, `usage.ts`.
- `src/api/`: Fastify routes (`routes/game.ts` is stateless, loads from the DB per request; `routes/codex.ts`).
- `src/infra/`: `db.ts` save stores behind `gameDb` (SQLite via Prisma, or `JsonStore` files in `saves/` when `DB_DRIVER=json` or SQLite fails to load; world state re-validated with `WorldStateSchema` on write and load), `benchmarks.ts`.
- `ui/`: React app, Zustand store `ui/src/store/gameStore.ts`, scenes, desk and map, reveal. `data/`: static JSON (41 country profiles, scenarios `1960`/`1990`/`2025`/`2026`, 8 flashpoints, codex, generated benchmarks).

Frontend essentials:

- **Types are duplicated, not shared**: `gameStore.ts` re-declares the backend types; changing a backend schema means updating both.
- Player-facing words come from `ui/src/lib/glossary.ts`; `tests/ui-glossary.spec.ts` bans synonyms in UI strings, objective labels and docs/GAMEPLAY.md.
- One outcome vocabulary: every order, decision and foreign move in the turn report carries `status` (DONE, PARTLY, FAILED, REFUSED, NO_EFFECT) and `reason` from `src/core/status.ts`; a cost is not a failure. `report.yourMove` is the player's own move, never a front. The UI renders status via `ui/src/lib/outcome.ts` and never infers one from facts.
- Staff-proposed orders (`proposed: true`) hold no political capital or slot until approved; Execute sends only `committedActions()`. Order availability is shared by preview, `/orders/menu` and Execute (`core/availability.ts`, `ui/src/lib/availability.ts` with identical copy).

### Simulation invariants & balance

- Wars use a single `frontline` (0-100, 50 = stalemate); ends at 85/15 or by exhaustion ceasefire.
- Nuclear: two-strike rule (2 consecutive successful strikes cripple a DEVELOPING program; TESTED+ is invulnerable); nuclear use means global embargo, every relation -60, approval and legitimacy crash, possible retaliation chain, `NUCLEAR_HOLOCAUST` game over; a war won with a nuclear weapon gives no victory rally.
- An airstrike on a nuclear power (TESTED+) outside a war is an act of war: the target declares war (pacts join), CRITICAL war event, approval/legitimacy/stability fall (`TurnEngine.actOfWar`). `tests/core/wild-moves.spec.ts` guards both rules above.
- Global tension: per-turn rise cap (+8, +30 on war/nuclear shock), AI-generated tension counts half, decays 26%/turn toward a war-count floor (min(60, 25+6*wars)). Standing border deployments add at most 1.5/month in total. Target: median 45-70, <=20% of months >=80; verify with `npm run sim` when adding tension sources.
- Relations drift 2%/month toward a structural equilibrium (alliances, rivalries, regime affinity). Ceasefires depend on exhaustion and who is winning.
- The player can be deposed (election loss, coup, revolution, assassination) but coups/revolutions are telegraphed first (`coup_plot` / `streets_boiling` crises). Sessions end at `world.maxTurns` (mode-dependent). Score is 4x50 components drifting 15%/month toward situation-derived targets.
- Political capital is flat: 2 per month (3 in FLASHPOINT, +1 on ANALYST), cap 6, no popularity bonus. At most 6 orders a month (`MAX_ORDERS` in `turn.ts`), one per type+target; only the first denunciation each month moves approval. Crisis-injected actions bypass these limits.
- `CountryState.realGrowth` is the smoothed, annualised actual GDP change (computed in `turn.ts` after phase 6); the HUD, economic score and peacetime voter mood read it. Never show `growthRate` to players.
- AI defence pacts: rare, never with a belligerent, max 4, none with TWN. AI proposals to the player become a `pact_offer` crisis. Wars joined to help someone carry `alliedWith` and end with the principal's war.
- Scripted flashpoint crises can declare `requiresWar: [a, b]` and are skipped once that war is over.
- `DataLoader.newGame()` returns a deep copy: never let game state share objects with the loader's cached profiles/scenarios.
- Term objectives: survival is the win; bonuses are score 115+ and a statecraft goal (end the inherited war / mend ties with the worst rival). Reform has 6-month diminishing returns outside Flashpoints and lifts `trendGrowth`.
- Generated prose uses `possessive()` / `withArticle()` from `src/core/text.ts` (the UI has a copy of `withArticle` in `ui/src/lib/format.ts`). Order vocabulary and costs live in `ui/src/lib/actions.ts`.
- Benchmarks: `data/benchmarks/` carries a fingerprint of scoring, objectives, costs, chronicle, achievements, reveal, all systems and flashpoint objectives/signatures (`src/infra/benchmarks.ts`). Changing any of these makes `tests/core/benchmarks.spec.ts` fail as stale: run `npm run bench:reveal` and commit the folder. Never hand-merge it; regenerate.
- Era filter (`src/core/era.ts`): a country with `eraStatus` is not a state (1960: UKR, BLR, SYR, ARE, PSX, NGA until 1960-10; 1990: UKR, BLR; none in 2025/2026). `newGame` refuses it as the player seat outside flashpoints unless `whatIf` (D-56: never remove a seat).
- Replay record: `world.origin` + `world.inputs` (per month: actions, decisions, non-ALGORITHMIC tier). Anything `/turn` changes in the world besides `executeTurn` must go through `recordMonth` in `replay.ts`, or branches stop matching their source (`tests/api/seats-replay.spec.ts`).
- Balance targets (harness): smart 70-95% wins pooled (no seat below 65%), none <=20%, random 15-45%; Iran's Term is exempt. Use `--games 36` near a band edge.

## Conventions

- ESM throughout (`"type": "module"`); backend imports use explicit `.js` extensions (`./types.js`) due to NodeNext resolution.
- Path aliases `@core`, `@agents`, `@api`, `@infra` exist, but existing code uses relative imports: match the surrounding file.
- Backend is linted/formatted by Biome (2-space indent, 100-char lines); the UI uses its own ESLint config. Don't run Biome on `ui/`.
- No em dash characters anywhere (docs, site, game text, code, commit messages); use commas, colons, parentheses or a hyphen. `tests/repo-style.spec.ts` enforces it for tracked files and also fails on committed merge-conflict markers (resolve generated files one by one, never with a multi-path checkout).
- `npm test` runs the main suite, then the timing tests in `tests/perf` on their own.
- Commit messages: conventional-commit style (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Development process lives in `devloop/`, a self-contained, reusable module (method, Playwright kit, templates, `HOW_WE_WORK.md`, `LEARNINGS.md`); World Conflict specifics (customer panel, team charters, goals, gate, decision ledger, journal, iteration runs) are in `devloop/instances/world-conflict/`. Keep product details out of `devloop/method`, `kit` and `templates`.
- Design docs and project specs live in `dev_plan/` (`spec.md`, `reviews/`, `project_status.html` live status page). Public docs: `docs/` (SETUP, GAMEPLAY, ARCHITECTURE, API, DEVELOPMENT).
