# 🧑‍💻 Development Guide

For contributors. Read **[ARCHITECTURE.md](ARCHITECTURE.md)** first.

---

## Stack

| Layer | Tech |
|---|---|
| Engine & API | Node.js ≥ 20.19, TypeScript 5.9 (ESM, NodeNext), Fastify 5, Zod 4, Prisma 7 + SQLite (better-sqlite3) |
| AI | Deterministic `PersonalityAI`; optional LLMs via `@anthropic-ai/sdk` (Claude), OpenAI, Gemini, Ollama, OpenAI-compatible local servers |
| Client | React 19, Vite 7, Zustand 5, MapLibre GL 5, Tabler Icons; fonts Barlow Condensed · Inter · IBM Plex Mono · Playfair Display |
| Quality | Vitest, Biome (backend), ESLint (UI), Playwright (screenshot tours) |

---

## Layout

```
src/
  core/            deterministic engine: no I/O, no LLMs, no Math.random()
    turn.ts          monthly pipeline
    crises.ts        drama director + player crisis templates
    events.ts        world events
    objectives.ts    win/lose conditions, stars
    costs.ts         political capital & budget-share costs
    data-loader.ts   scenarios, flashpoints, modes
    systems/         military · diplomacy · covert · nuclear · economy · stability · intelligence · government
  agents/          PersonalityAI, AI-tier strategist, LLM clients, usage meter, advisors
  api/             Fastify server + routes (game, chat, auth)
  infra/db.ts      Prisma access
data/              countries (41) · scenarios (1960, 1990, 2025, 2026) · flashpoints (8)
ui/src/
  components/      TitleScreen, Hud, Desk, Chronicle, EndScreen, Drawers, MapView, SettingsModal…
  store/           gameStore.ts (client state + API)
  styles/wc.css    design tokens & components
  lib/format.ts    flags, money, effect arrows
scripts/simulate.ts headless playtest harness
tests/             vitest suites (engine, agents, drama, determinism)
dev_plan/          spec, reviews, project_status.html
```

---

## Commands

```bash
npm run dev                     # API + UI
npm test                        # all tests
npx vitest run tests/core/drama.spec.ts
npm run lint && (cd ui && npm run lint)
npm run build
npm run sim -- --mode TERM --scenario 2026 --countries USA,UKR --games 12 --policy smart,none
```

---

## Invariants

1. **Determinism.** Same seed + same intents ⇒ same world (`tests/core/determinism.spec.ts`). Use `SeededRandom`; never `Math.random()` or wall-clock time in `src/core`.
2. **LLMs propose, the engine decides.** Anything from an LLM is a `CountryIntent` that passes `parseDecision` validation; failures fall back to `PersonalityAI`.
3. **Fog of war.** Never send foreign ground truth to the client, go through `publicWorldState()`.
4. **Types are duplicated** between `src/core/types.ts` and `ui/src/store/gameStore.ts`. Change both.
5. **Tension** must keep breathing: when adding a tension source, check `npm run sim` reports a median of 45–70 and ≤ 20% of months at 80+.

---

## The playtest harness

`scripts/simulate.ts` plays whole games headlessly and prints one JSON line per policy × country:

| Policy | Plays like |
|---|---|
| `none` | never acts; crises resolve by default |
| `propaganda` | national address every month (the old dominant strategy) |
| `smart` | competent heuristic player with good crisis choices |
| `random` | random affordable orders and crisis options |
| `hawk` | mobilizes and attacks its main rival |
| `ai` | its country is run by `PersonalityAI` |

Key outputs: `win`, `stars`, `closeCall` (share of games with a near-loss), `winWithCloseCall`, `comebacks`, `decisionTurns`, `tensionMedian`, `tension80`, `telegraphed` (depositions preceded by a warning).

**Design targets:** smart wins 55–85% · none ≤ 20% · random 15–45% · ≥ 1 decision in ≥ 50% of Term months and every Flashpoint month · every non-election deposition telegraphed.

---

## Adding content

### A crisis template (`src/core/crises.ts`)
Add an entry to `TEMPLATES`: `weight(ctx)` (0 = ineligible) and `build(ctx)` returning a headline, text and a decision with 2–3 options (`effects`, `tensionDelta`, `actions`, `backedBy`, optional `followUp`). Ground it in a real historical pattern and keep the trade-offs readable. Run `npm run sim` to check cadence.

### A flashpoint (`data/flashpoints/<id>.json`)
Follow `FlashpointSchema` in `src/core/data-loader.ts`: base `scenarioId`, `playable` sides with roles and difficulty, `setup` (wars with exhaustion, `endWars`, relations, country tweaks), per-side `objectives` (primary + bonus conditions, par, debrief) and `scripted` crises (turn 0 = cold open). Balance with `npm run sim -- --flashpoint <id> --scenario 2026 --countries A,B --policy smart,none,random`.

### A country (`data/countries/<ISO3>.json`)
Use the Natural Earth `ADM0_A3` code (the West Bank is `PSX`), validate against `CountryProfileSchema`, add it to `TIER1_COUNTRIES`, give it a leader in each scenario and a name pool in `systems/government.ts`.

---

## Keeping the world current (world scan)

The world moves on after release. A regular scan keeps the game's history, leaders and playable crises current, with a human approving every change:

```bash
npm run world:scan                          # read the feeds in data/world-scan/sources.json
npm run world:scan -- --input news.txt      # or a file: one headline per line, "2026-11-18 | headline | link"
npm run world:scan -- --llm anthropic       # refine with an LLM (key in .env); add --draft to draft new flashpoints
npm run world:apply -- data/world-scan/proposals/<date>.json            # apply items marked "accept": true
npm run world:apply -- <file> --ids h-JPN-...,l-JPN,b-0                  # or exactly these ids
```

1. **Scan** tags each headline with the game's countries (names, demonyms, capitals, leaders: `data/world-scan/aliases.json`) and the kind of event (war, ceasefire, coup, election, leadership change, sanctions, nuclear, unrest, disaster, blockade, cyber, terror...). It writes `data/world-scan/proposals/<date>.json` and a readable `<date>.md`:
   - **History entries** per country, skipping anything already in the profile's `keyEvents`.
   - **Leader changes** (the heuristic flags them; the LLM step or a human fills in the name).
   - **Crisis patterns**: each kind of event in the news, with the crisis cards that already cover it, and (with `--llm`) new dilemmas the game has no card for. Crisis cards are code in `src/core/crises.ts`, so these are a design backlog.
   - **Flashpoint candidates**: pairs of countries named together in conflict news, marked when a flashpoint already covers them. With `--llm --draft`, the top two uncovered ones are drafted as full flashpoint files and validated against `FlashpointSchema`.
   - **Briefing lines** for the 2026 scenario.
2. **Review**: set `"accept": true` on what you want (edit the event or impact text freely).
3. **Apply** appends history lines to `data/countries/*.json` (keeping the file layout and re-validating each profile), updates 2026 leaders and briefing lines (`b-<n>` ids), writes accepted flashpoint drafts to `data/flashpoints/` (they become playable), then starts the 2026 world and every flashpoint and plays three months as a smoke test. Run `npm test` and commit.

Run it weekly or after a major world event. The feeds must be reachable from where it runs (a cloud session needs their hosts in its network allowlist); `--input` works offline with pasted headlines.

## Conventions

- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Backend: Biome, 2-space, 100 columns, explicit `.js` import extensions. UI: ESLint.
- Every engine change ships with a test; every balance change ships with harness numbers in the commit message or `dev_plan/project_status.html`.
