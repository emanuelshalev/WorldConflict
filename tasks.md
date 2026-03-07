# TASKS.md: World Conflicts — Complete Agent Roadmap

> **Rules:** P0 → P1 progression only. Mark `[x]`. Move to **COMPLETED**. One task at a time.

---

## Stage 0: Project Skeleton (1 day) ✅ **SOLID**
### P0
- [ ] **0.1** Monorepo: `pnpm init`, TypeScript/ESLint/Prettier setup
- [ ] **0.2** Backend: Fastify server + `/health` endpoint  
- [ ] **0.3** Frontend: Vite+React+TypeScript+Mantine+MapLibre
- [ ] **0.4** Prisma+SQLite: `WorldState` table schema
- [ ] **0.5** Core types + Zod: `WorldState`, `CountryState`, `Action`
- [ ] **0.6** NPM scripts: `dev`, `build`, `test`, `lint`, `perf`
- [ ] **0.7** Verify: Backend 8080, Frontend 3000 both work

---

## Stage 1: Core Simulation (3 days) **NEEDS EVENT SYSTEM**
### P0
- [ ] **1.1** `src/core/world.ts`: WorldState + 25 Tier 1 countries
- [ ] **1.2** `src/core/country.ts`: CountryState + JSON loader  
- [ ] **1.3** `src/core/events.ts`: Event system (random + triggered)
- [ ] **1.4** `src/core/turn.ts`: Complete lifecycle (events→AI→resolve)
- [ ] **1.5** Diplomacy: Relations matrix, alliances, war triggers
- [ ] **1.6** Economy: GDP simulation + military budget
- [ ] **1.7** Military: Manpower/airpower + war resolution
- [ ] **1.8** Stability: Monthly decay + collapse logic
- [ ] **1.9** `src/core/newspaper.ts`: Event→headline generation
- [ ] **1.10** Unit tests: 95% coverage ALL core modules
- [ ] **1.11** Determinism test: Same seed = identical 24 turns

---

## Stage 2: Data Infrastructure (1.5 days) **ADD MAP DATA**
### P0
- [ ] **2.1** 25× Tier 1 country JSON: `data/countries/USA.json` etc.
- [ ] **2.2** `data/world.geojson`: Country borders (simplified, 25 countries)
- [ ] **2.3** `src/core/data-loader.ts`: Countries + GeoJSON loader
- [ ] **2.4** `src/infra/db.ts`: Prisma WorldState serialization
- [ ] **2.5** API: `/save`, `/load`, `/saves` endpoints
- [ ] **2.6** `src/core/seed.ts`: Deterministic RNG wrapper
- [ ] **2.7** Integration test: Save/load roundtrip perfect

---

## Stage 3: Agent Layer (2.5 days) **ADD PROMPTS**
### P0
- [ ] **3.1** `src/agents/llmClient.ts`: OpenAI + Ollama abstraction
- [ ] **3.2** Zod schemas: `CountryIntent`, `AdvisorResponse`, `Headline`
- [ ] **3.3** `src/agents/prompts/country-leader.ts`: 25 country templates
- [ ] **3.4** `src/agents/prompts/advisor.ts`: 6 advisor roles (FM/DM/etc)
- [ ] **3.5** `src/agents/countryAgent.ts`: Parallel 25-country intents
- [ ] **3.6** `src/agents/advisorAgent.ts`: Chat conversation state
- [ ] **3.7** Fallback: Heuristic AI (relations-based decisions)
- [ ] **3.8** Perf test: 25 agents <200ms total elapsed

---

## Stage 4: API Layer (1 day) ✅ **SOLID**
### P0
- [ ] **4.1** `/new-game`, `/turn`, `/state`, `/chat` endpoints
- [ ] **4.2** Session auth (localStorage tokens)
- [ ] **4.3** Error middleware + logging
- [ ] **4.4** Rate limits + CORS + security headers

---

## Stage 5: UI Foundation (2 days) **ADD DEBUG MODE**
### P0
- [ ] **5.1** `App.tsx`: Header + Map + Sidebar + Modals layout
- [ ] **5.2** `MapView.tsx`: MapLibre + OpenStreetMap + country borders
- [ ] **5.3** 5× Map layers: Political/Military/Economic/Stability/Intel
- [ ] **5.4** `NewGameModal.tsx`: Year picker + 25 country selector
- [ ] **5.5** `GameStore.ts`: Zustand + full API integration
- [ ] **5.6** `SaveLoadMenu.tsx`: List + confirmation dialogs
- [ ] **5.7** `DebugOverlay.tsx`: ?debug=1 → GroundTruth + AI reasoning

---

## Stage 6: Turn Flow (2.5 days) **ADD BACKSTORY**
### P0
- [ ] **6.1** `Newspaper.tsx`: Fullscreen auto-advance (3s) headlines
- [ ] **6.2** `ActionMenu.tsx`: Diplomacy/Military/Economy/Intel tabs
- [ ] **6.3** `AdvisorChat.tsx`: Split-screen + conversation history
- [ ] **6.4** `TurnResolution.tsx`: Metrics delta + headline reel
- [ ] **6.5** `LeadershipBackstory.tsx`: LLM-generated intro narrative
- [ ] **6.6** Loading states: ALL spinners/skeletons
- [ ] **6.7** Error states: ALL failure modes handled
- [ ] **6.8** E2E test: New game → 24 turns → save/load → end

---

## Stage 7: Scoring & Reports (1.5 days) **SOLID**
### P0
- [ ] **7.1** `src/core/scoring.ts`: Multi-dimensional leadership score
- [ ] **7.2** `src/core/report.ts`: Timeline + charts + evaluation
- [ ] **7.3** `EndGameReport.tsx`: Multi-page + PDF export
- [ ] **7.4** Perf benchmark: `<200ms turns` guaranteed

---

## Stage 8: Quality Gate (1.5 days) **ADD COVERAGE**
### P0
- [ ] **8.1** Unit tests: Core 95%+, Agents 90%+, API 85%
- [ ] **8.2** Integration: All turn types + save/load edge cases
- [ ] **8.3** Playwright E2E: Core flows + error recovery
- [ ] **8.4** `npm run perf`: Automated <200ms benchmark suite
- [ ] **8.5** README.md: Setup + screenshots + architecture
- [ ] **8.6** Docker: Single-container production deploy
- [ ] **8.7** Offline mode: Full core sim no-LLM verified

---

## P1: Nice-to-Have (Post-MVP)
### Polish
- [ ] Keyboard shortcuts (map navigation, menus)
- [ ] PWA manifest + offline caching
- [ ] Settings: LLM model selector, turn speed

---

## COMPLETED
*(Agent populates)*

---

## 🎯 **IMPROVEMENTS MADE:**
