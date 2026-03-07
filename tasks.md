# TASKS.md: World Conflicts — Complete Agent Execution Roadmap

> **Rules:** Work **top-to-bottom**. Complete **ALL P0 tasks** in a stage before next stage. One task at a time. Mark `[x]`. Move to **COMPLETED**. Follow `AGENTS_PLAN.md` verification protocol.

**Total P0: 61 tasks | Est: 17-19 days | MVP Target: 3 weeks**

---

## Stage 0: Project Skeleton (1 day)
**Monorepo + tooling + minimal runnable app**

### P0 (Critical)
- [x] **0.1** Initialize monorepo: `pnpm init`, root `tsconfig.json`, ESLint + Prettier + Biome
- [x] **0.2** Backend: `pnpm add fastify @fastify/cors zod`, `src/api/server.ts` + `/health` endpoint  
- [x] **0.3** Frontend: `pnpm create vite ui --template react-ts`, Mantine 7.x + MapLibre GL JS + Zustand
- [x] **0.4** Database: `pnpm add prisma @prisma/client better-sqlite3`, `prisma/schema.prisma` (`WorldState`)
- [x] **0.5** Core types: `src/core/types.ts` (WorldState, CountryState, Turn, Action, CountryIntent) + Zod schemas
- [x] **0.6** NPM scripts: `dev`, `build`, `test`, `lint`, `perf`, `db:push`
- [x] **0.7** Verify: Backend localhost:8080/health ✅, Frontend localhost:5173 ✅

---

## Stage 1: Core Simulation Engine (3 days)
**Pure deterministic logic — NO LLM/IO/HTTP dependencies**

### P0 (Critical)
- [x] **1.1** `src/core/world.ts`: WorldState class + initialization (empty 25-country shell)
- [x] **1.2** `src/core/country.ts`: CountryState class + validation (Zod schema)
- [x] **1.3** `src/core/events.ts`: Event system (random seeded + triggered events)
- [x] **1.4** `src/core/turn.ts`: Complete turn lifecycle (events→AI→resolve→newspaper)
- [x] **1.5** `src/core/systems/diplomacy.ts`: Relations matrix (-100:+100), alliances, war triggers
- [x] **1.6** `src/core/systems/economy.ts`: GDP simulation, military budget allocation
- [x] **1.7** `src/core/systems/military.ts`: Manpower, airpower, monthly war resolution
- [x] **1.8** `src/core/systems/stability.ts`: Monthly decay/growth, collapse detection
- [x] **1.9** `src/core/newspaper.ts`: Event→headline generation (deterministic)
- [x] **1.10** Unit tests: `tests/core/` — 80 tests passing
- [x] **1.11** Determinism test: Same seed → identical 24-turn simulation ✅

---

## Stage 2: Data Infrastructure & Country Profiles (2.5 days)
**Static configs + realistic 25-country data + persistence**

### P0 (Critical)
- [ ] **2.1** **Data research**: SIPRI military [web:65], World Bank manpower [web:72], CIA Factbook regimes
- [ ] **2.2** `data/world.geojson`: Simplified GeoJSON borders for 25 Tier 1 countries (NaturalEarth 110m)
- [ ] **2.3** **25× Country JSON files**: `data/countries/*.json` (USA, CHN, RUS, DEU, IND, etc.) with:
{id, iso3, name, population, gdp, gdpGrowth, militaryBudgetPct, manpower, airpower,
regimeType, riskTolerance, goals[], geo.bounds}

text
- [ ] **2.4** `data/scenarios/*.json`: 1950, 1960, ..., 2025 multipliers (Cold War, post-1991, etc.)
- [ ] **2.5** `src/core/data-loader.ts`: Load countries + scenarios + relations matrix generator
- [ ] **2.6** `src/infra/db.ts`: Prisma WorldState serialization (JSONB)
- [ ] **2.7** API: `POST /save`, `GET /load`, `GET /saves`, `POST /new-game/{year}/{country}`
- [ ] **2.8** `src/core/seed.ts`: Deterministic RNG (year+country seed)
- [ ] **2.9** Data validation: GDP/military ratios realistic, NATO relations >+20
- [ ] **2.10** Integration test: Load 25 countries → 5 turns → save/load perfect

---

## Stage 3: Agent Layer (2.5 days)
**LLM integration with bulletproof validation**

### P0 (Critical)
- [ ] **3.1** `src/agents/llmClient.ts`: Abstract interface + OpenAI + Ollama HTTP clients
- [ ] **3.2** `src/agents/schemas.ts`: Zod schemas (`CountryIntent`, `AdvisorResponse`, `Headline`)
- [ ] **3.3** `src/agents/prompts/country-leader.ts`: 25× country-specific leader prompts
- [ ] **3.4** `src/agents/prompts/advisor.ts`: 6× advisor roles (Foreign Minister, Defense Minister, etc.)
- [ ] **3.5** `src/agents/countryAgent.ts`: Parallel intents for 25 countries (<200ms total)
- [ ] **3.6** `src/agents/advisorAgent.ts`: Chat state management + conversation memory
- [ ] **3.7** `src/agents/fallback.ts`: Heuristic AI (relations-weighted decisions)
- [ ] **3.8** Agent perf test: 25 parallel calls <200ms elapsed, 98% valid JSON
- [ ] **3.9** Integration test: Full turn cycle with AI decisions (no crashes)

---

## Stage 4: API Layer (1 day)
**HTTP transport + game endpoints + security**

### P0 (Critical)
- [ ] **4.1** Game API: `POST /new-game`, `POST /turn`, `GET /state`, `DELETE /game`
- [ ] **4.2** Chat API: `POST /chat/advisor` (conversation persistence)
- [ ] **4.3** Session auth: localStorage tokens + CSRF protection
- [ ] **4.4** Error middleware: User-friendly 500s + structured logging
- [ ] **4.5** Rate limits: 1 turn/sec, 5 chat/sec, CORS headers
- [ ] **4.6** API docs: OpenAPI spec or README endpoints table

---

## Stage 5: UI Foundation (2 days)
**React SPA + MapLibre + complete layout**

### P0 (Critical)
- [ ] **5.1** `ui/src/App.tsx`: Header + Map(70%) + Sidebar(30%) + Modal system
- [ ] **5.2** `ui/src/map/MapView.tsx`: MapLibre GL JS + OpenStreetMap tiles + country borders
- [ ] **5.3** Map layers (5 toggleable): Political, Military, Economic, Stability, Intelligence
- [ ] **5.4** `NewGameModal.tsx`: Year picker (1950-2025, 5yr steps) + 25 country selector
- [ ] **5.5** `GameStore.ts`: Zustand store + full API integration + offline detection
- [ ] **5.6** `SaveLoadMenu.tsx`: Save list + confirmation dialogs + delete
- [ ] **5.7** `DebugOverlay.tsx`: `?debug=1` → GroundTruth view + AI reasoning toggle

---

## Stage 6: Turn Flow Experience (2.5 days)
**Complete monthly gameplay loop**

### P0 (Critical)
- [ ] **6.1** `Newspaper.tsx`: Fullscreen monthly headlines + auto-advance (3s)
- [ ] **6.2** `ActionMenu.tsx`: Tabbed (Diplomacy | Military | Economy | Intel) + action forms
- [ ] **6.3** `AdvisorChat.tsx`: Split-screen chat + role selector + history + typing indicators
- [ ] **6.4** `TurnResolution.tsx`: Metrics delta visualization + headline reel
- [ ] **6.5** `LeadershipBackstory.tsx`: LLM-generated intro narrative on new game
- [ ] **6.6** Loading states: ALL spinners, skeletons, progress bars implemented
- [ ] **6.7** Error states: ALL failure modes (save fail, LLM fail, etc.) handled gracefully
- [ ] **6.8** E2E test: New game → 24 turns → save/load → leadership end

---

## Stage 7: Scoring & Leadership Reports (1.5 days)
**End-game evaluation + export**

### P0 (Critical)
- [ ] **7.1** `src/core/scoring.ts`: Multi-dimensional score (economy=30%, security=30%, diplomacy=25%, stability=15%)
- [ ] **7.2** `src/core/report.ts`: Timeline + charts + leadership style classification
- [ ] **7.3** `EndGameReport.tsx`: Multi-page modal + PDF/JSON export
- [ ] **7.4** Performance suite: `npm run perf` → <200ms turns guaranteed
- [ ] **7.5** Offline mode: Core simulation functional without LLM

---

## Stage 8: Quality Gate (2 days)
**Production readiness + comprehensive testing**

### P0 (Critical)
- [ ] **8.1** Unit tests: Core 95%+, Agents 90%+, API 85% coverage
- [ ] **8.2** Integration tests: All turn types + save/load edge cases + AI failure modes
- [ ] **8.3** Playwright E2E: Core flows + error recovery + mobile responsive
- [ ] **8.4** `npm run perf`: Automated benchmark (<200ms turns, 60fps map)
- [ ] **8.5** README.md: Setup + screenshots + architecture diagram + data sources
- [ ] **8.6** Docker: Single-container production deployment
- [ ] **8.7** PWA manifest: Offline caching + install prompt

---

## P1: Post-MVP Polish (After Stage 8)
### Quality of Life
- [ ] Keyboard shortcuts (map pan/zoom, menu navigation, turn advance)
- [ ] Settings panel: LLM model selector, animation speed, debug toggles
- [ ] Data export: Full game JSON for analysis
- [ ] Analytics: Turn completion stats, most-played scenarios

---

## COMPLETED

### Stage 0: Project Skeleton ✅
- [x] **0.1** Initialize monorepo (npm, tsconfig.json, ESLint, Prettier, Biome)
- [x] **0.2** Backend Fastify server with /health endpoint
- [x] **0.3** Frontend Vite React-TS with Mantine, MapLibre, Zustand
- [x] **0.4** Database Prisma + SQLite setup
- [x] **0.5** Core types with Zod schemas
- [x] **0.6** NPM scripts configured
- [x] **0.7** Backend :8080 and Frontend :5173 verified

### Stage 1: Core Simulation Engine ✅
- [x] **1.1** WorldState class + initialization (25-country shell)
- [x] **1.2** CountryState class + validation
- [x] **1.3** Event system (seeded random + triggered)
- [x] **1.4** Turn lifecycle (events→AI→resolve→newspaper)
- [x] **1.5** Diplomacy system (relations, alliances, war)
- [x] **1.6** Economy system (GDP, military budget)
- [x] **1.7** Military system (manpower, airpower, war resolution)
- [x] **1.8** Stability system (decay/growth, collapse)
- [x] **1.9** Newspaper generation
- [x] **1.10** Unit tests (80/80 passing)
- [x] **1.11** Determinism verified (same seed = identical results)
