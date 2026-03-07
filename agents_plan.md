AGENTS_PLAN.md: World Conflicts — Autonomous Agent Execution Plan
🎯 Goal
Implement the MVP defined in SPEC.md by completing all P0 tasks in TASKS.md (to be created), then P1 tasks if time permits. Deliver a fully functional, deterministic 25-country global conflict simulator.

🚀 Operating Mode
End-to-end autonomous execution with minimal human intervention:

text
1. Read SPEC.md → Understand complete scope
2. Read TASKS.md → Execute P0 tasks top-to-bottom  
3. implement → test → fix → commit → repeat
4. ONLY stop when: all P0 complete OR hard technical blocker
⚠️ Critical Constraints (MUST follow)
SPEC.md is source of truth — Never expand scope beyond MVP definition

TASKS.md defines priority — Complete P0 before touching P1

Keep npm run dev working after every single change

25-country limit — No Tier 2/3 countries until Phase 2

Pure core simulation — /core has ZERO LLM/network dependencies

Structured LLM outputs only — Validate ALL agent responses with Zod schemas

Incremental commits — One logical task per commit

✅ Definition of Done (MVP)
Project ships when ALL are true:

text
[ ] All P0 tasks completed ✓ (TASKS.md)
[ ] `npm run dev` runs without errors
[ ] Player completes 24-turn game ✓ (no crashes)
[ ] Simulation 100% deterministic (same seed = same results)
[ ] Turn resolution <200ms (25 countries)
[ ] Save/load verified across 10 games
[ ] AI generates valid intents 98%+ of turns
[ ] Map renders smoothly (60fps)
[ ] Leadership report generates correctly
[ ] All core systems >95% unit test coverage
[ ] Offline mode functional (no LLM required)
[ ] README.md has setup + quickstart
🔄 Required Verification Loop (After EVERY task)
text
1. Run `npm run lint` → Fix all errors
2. Run `npm run test` → 100% pass rate  
3. Run `npm run build` → Clean build
4. Run `npm run dev` → Manual smoke test:
   - New game → 3 turns → save → reload → end game
5. Performance check: `npm run perf` → <200ms turns
6. If ANY fail → diagnose → fix → repeat
💾 Auto-Commit Protocol (MANDATORY)
After each completed task:
text
1. Update TASKS.md:
   - Mark task complete: `- [x] Task description`
   - Move to ## COMPLETED section

2. Append to PROGRESS.md:
2026-03-07 | Task 1.2 | feat: world state types (1.2)
Files: src/core/world.ts, src/core/types.ts
Tests: 12/12 passed | Build: ✅ | Perf: 45ms
Notes: Added Zod validation for WorldState

text

3. Git commit:
<type>: <description> (<task-id>)
feat: implement country state model (2.1)
test: add world validation tests (2.2)
fix: resolve turn resolution perf issue (3.4)
docs: update readme with setup (9.1)

text

## 📁 File Structure Rules

src/
├── core/ ⭐ NO LLM/IO dependencies
│ ├── world.ts
│ ├── country.ts
│ ├── turn.ts
│ └── systems/
├── agents/ ⭐ LLM integration only
│ ├── llmClient.ts
│ └── prompts/
├── api/ ⭐ HTTP transport
├── ui/ ⭐ React SPA
└── data/ ⭐ Static JSON configs

text

**NEVER** put LLM calls in `/core`. **NEVER** put UI in `/core`.

## 🧪 Testing Requirements

### Every feature needs:
✅ Unit tests (>95% coverage)
✅ Integration test (full turn cycle)
✅ Manual verification steps
✅ Performance benchmark (<200ms)

text

### Critical test suites:
tests/core/
├── world.spec.ts # State serialization
├── turn.spec.ts # Complete turn cycles
├── determinism.spec.ts # Seed validation
└── systems/
├── diplomacy.spec.ts
├── war.spec.ts
└── economy.spec.ts

text

**Primary Sources (2025 data):**
1. SIPRI Military Expenditure [web:65] → militaryBudgetPct
2. World Bank MS.MIL.TOTL.P1 [web:72] → manpower  
3. CIA World Factbook → regime types, risk tolerance
4. IMF GDP forecasts → gdp, growthRate
5. Global Firepower Index [web:69] → airpower ratios

**Historical Scenarios:**
1. Correlates of War [web:71] → 1950-2025 baselines
2. Penn World Tables → GDP historical
3. Scenario multipliers: Cold War (+tension), Post-1991 (+globalization)

**Geo Data:**
1. NaturalEarth 110m → simplified country borders
2. country-borders/datasets/country-borders [GitHub] → GeoJSON

## 🎮 Implementation Priority (P0 Tasks)

**Phase 0: Foundation (Week 1)**
Project skeleton + TypeScript config

Core types (WorldState, CountryState, Turn)

SQLite setup + basic save/load

Minimal React app + map placeholder

text

**Phase 1: Core Simulation (Week 2-3)**
World initialization (25 countries)

Turn lifecycle (deterministic)

Diplomacy system + relations matrix

Basic economy + GDP simulation

Military basics + war resolution

Stability system

text

**Phase 2: Agents + UI (Week 4)**
LlmClient abstraction + OpenAI/Ollama

CountryAgent + structured intents

MapLibre integration + 5 layers

Newspaper UI + turn summaries

Advisor chat interface

text

**Phase 3: Polish + Reports (Week 5)**
Leadership scoring system

End-game report generation

Performance optimization (<200ms)

Error handling + offline mode

Documentation + README

text

## 🔧 Tech Stack (Locked — NO deviations)

Language: TypeScript (strict)
Backend: Node.js 20+ / Fastify
Frontend: React 18 / Vite / Zustand
Maps: MapLibre GL JS + OpenStreetMap
UI: Mantine 7.x
DB: SQLite / Prisma
Validation: Zod schemas
Testing: Vitest + Playwright
Build: Vite (frontend/backend)

text

## 🤖 Agent-Specific Instructions

### LLM Integration Rules:
ALWAYS validate JSON outputs with Zod schemas

Token limit: <8k input, <1k output per request

Parallel calls for all 25 countries

Fallback: heuristicAI() if LLM fails 3x

NEVER mutate WorldState directly

text

### Prompt Engineering:
CountryAgent: "You are [COUNTRY] leader. Given YOUR belief state..."

AdvisorAgent: "You are [ROLE] advisor. Player asks..."

NarrativeAgent: "Write neutral newspaper headline for..."

text

### Performance Guardrails:
Turn resolution MUST be <200ms (25 countries)
Profile with npm run perf after each system
If >150ms → Optimize before next feature

text

## 🛑 If Blocked

### Minor ambiguity → Continue:
Make smallest reasonable assumption

Document in PROGRESS.md: "Assumed X per SPEC.md Y"

Add TODO comment in code

Proceed

text

### Hard blocker → STOP:
Cannot run npm run dev

Tests consistently fail (>10% red)

SPEC.md contradiction found

LLM returns invalid JSON >5 attempts

text
**Output final status + blocker details to PROGRESS.md**

## 📊 PROGRESS Tracking

**PROGRESS.md format:**
2026-03-07 Session
12:00 AM: Started Phase 0.1 (project setup)

12:15 AM: feat: init TypeScript + Vite (0.1) ✓
Tests: 2/2 | Build: ✅ | Dev: ✅

12:45 AM: feat: core types + Zod schemas (1.1) ✓
Perf: N/A | Coverage: 100%

text

## 🎉 Success Criteria
✅ 25-country world simulates deterministically
✅ Player leads country through 2-year campaign
✅ Map shows intel overlays + country status
✅ AI countries make plausible diplomatic/military moves
✅ Leadership score calculated + report generated
✅ Game saves/loads perfectly
✅ Runs smoothly on mid-range laptop

text

---

**This plan turns Windsurf into a disciplined engineering team. Execute top-to-bottom. Report progress in PROGRESS.md. Ship MVP.**
