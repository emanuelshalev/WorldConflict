<div align="center">

# 🤖 World Conflict: Agent Execution Plan

### *Autonomous Development Guidelines*

</div>

---

## 📋 Table of Contents

1. [Goal](#-goal)
2. [Operating Mode](#-operating-mode)
3. [Critical Constraints](#️-critical-constraints)
4. [Definition of Done](#-definition-of-done-mvp)
5. [Verification Loop](#-verification-loop)
6. [Commit Protocol](#-commit-protocol)
7. [File Structure](#-file-structure)
8. [Testing Requirements](#-testing-requirements)
9. [Implementation Priority](#-implementation-priority)
10. [Tech Stack](#-tech-stack)
11. [Agent Instructions](#-agent-instructions)
12. [Blockers](#-handling-blockers)
13. [Bug Workflow](#-bug-workflow)
14. [Success Criteria](#-success-criteria)

---

# 🎯 Goal

Implement the MVP defined in `SPEC.md` by completing all **P0 tasks** in `TASKS.md`, then P1 tasks if time permits.

**Deliverable:** A fully functional, deterministic 25-country global conflict simulator.

---

# 🚀 Operating Mode

End-to-end autonomous execution with minimal human intervention:

```
1️⃣ Read SPEC.md      → Understand complete scope
2️⃣ Read TASKS.md     → Execute P0 tasks top-to-bottom  
3️⃣ Implement         → test → fix → commit → repeat
4️⃣ STOP only when    → All P0 complete OR hard technical blocker
```

---

# ⚠️ Critical Constraints

| Rule | Description |
|------|-------------|
| 📖 **SPEC.md is truth** | Never expand scope beyond MVP definition |
| 📋 **TASKS.md priority** | Complete P0 before touching P1 |
| ✅ **Always working** | Keep `npm run dev` working after every change |
| 🌍 **25 countries max** | No Tier 2/3 countries until Phase 2 |
| 🔒 **Pure core** | `/core` has ZERO LLM/network dependencies |
| 📝 **Structured output** | Validate ALL agent responses with Zod |
| 💾 **Incremental commits** | One logical task per commit |

---

# ✅ Definition of Done (MVP)

Project ships when **ALL** are true:

| Criteria | Status |
|----------|--------|
| All P0 tasks completed (TASKS.md) | ⬜ |
| `npm run dev` runs without errors | ⬜ |
| Player completes 24-turn game (no crashes) | ⬜ |
| Simulation 100% deterministic (same seed = same results) | ⬜ |
| Turn resolution <200ms (25 countries) | ⬜ |
| Save/load verified across 10 games | ⬜ |
| AI generates valid intents 98%+ of turns | ⬜ |
| Map renders smoothly (60fps) | ⬜ |
| Leadership report generates correctly | ⬜ |
| All core systems >95% unit test coverage | ⬜ |
| Offline mode functional (no LLM required) | ⬜ |
| README.md has setup + quickstart | ⬜ |

---

# 🔄 Verification Loop

**Run after EVERY task:**

```bash
# 1. Lint
npm run lint          # → Fix all errors

# 2. Test  
npm run test          # → 100% pass rate

# 3. Build
npm run build         # → Clean build

# 4. Smoke Test
npm run dev           # → Manual test:
                      #   New game → 3 turns → save → reload → end

# 5. Performance
npm run perf          # → <200ms turns

# ❌ If ANY fail → diagnose → fix → repeat
```

---

# 💾 Commit Protocol

After each completed task:

### 1️⃣ Update TASKS.md
```markdown
- [x] Task description  ← Mark complete
```
Move to `## COMPLETED` section

### 2️⃣ Append to PROGRESS.md
```
2026-03-07 | Task 1.2 | feat: world state types (1.2)
Files: src/core/world.ts, src/core/types.ts
Tests: 12/12 passed | Build: ✅ | Perf: 45ms
Notes: Added Zod validation for WorldState
```

### 3️⃣ Git Commit
```
<type>: <description> (<task-id>)

Examples:
feat: implement country state model (2.1)
test: add world validation tests (2.2)
fix: resolve turn resolution perf issue (3.4)
docs: update readme with setup (9.1)
```

---

# 📁 File Structure

```
src/
├── core/           ⭐ NO LLM/IO dependencies
│   ├── world.ts
│   ├── country.ts
│   ├── turn.ts
│   └── systems/
│
├── agents/         ⭐ LLM integration only
│   ├── llmClient.ts
│   └── prompts/
│
├── api/            ⭐ HTTP transport
│
├── ui/             ⭐ React SPA
│
└── data/           ⭐ Static JSON configs
```

> ⚠️ **NEVER** put LLM calls in `/core`. **NEVER** put UI in `/core`.

---

# 🧪 Testing Requirements

### Every Feature Needs:

| Requirement | Description |
|-------------|-------------|
| ✅ Unit tests | >95% coverage |
| ✅ Integration test | Full turn cycle |
| ✅ Manual verification | Documented steps |
| ✅ Performance benchmark | <200ms |

### Critical Test Suites:

```
tests/core/
├── world.spec.ts        # State serialization
├── turn.spec.ts         # Complete turn cycles
├── determinism.spec.ts  # Seed validation
└── systems/
    ├── diplomacy.spec.ts
    ├── war.spec.ts
    └── economy.spec.ts
```

### Data Sources:

| Source | Data |
|--------|------|
| SIPRI Military Expenditure | militaryBudgetPct |
| World Bank MS.MIL.TOTL.P1 | manpower |
| CIA World Factbook | regime types, risk tolerance |
| IMF GDP forecasts | gdp, growthRate |
| Global Firepower Index | airpower ratios |
| NaturalEarth 110m | simplified borders |

---

# 🎮 Implementation Priority

## Phase 0: Foundation (Week 1)
- [ ] Project skeleton + TypeScript config
- [ ] Core types (WorldState, CountryState, Turn)
- [ ] SQLite setup + basic save/load
- [ ] Minimal React app + map placeholder

## Phase 1: Core Simulation (Week 2-3)
- [ ] World initialization (25 countries)
- [ ] Turn lifecycle (deterministic)
- [ ] Diplomacy system + relations matrix
- [ ] Basic economy + GDP simulation
- [ ] Military basics + war resolution
- [ ] Stability system

## Phase 2: Agents + UI (Week 4)
- [ ] LlmClient abstraction + OpenAI/Ollama
- [ ] CountryAgent + structured intents
- [ ] MapLibre integration + 5 layers
- [ ] Newspaper UI + turn summaries
- [ ] Advisor chat interface

## Phase 3: Polish + Reports (Week 5)
- [ ] Leadership scoring system
- [ ] End-game report generation
- [ ] Performance optimization (<200ms)
- [ ] Error handling + offline mode
- [ ] Documentation + README

---

# 🔧 Tech Stack

> **LOCKED: NO deviations**

| Category | Technology |
|----------|------------|
| **Language** | TypeScript (strict) |
| **Backend** | Node.js 20+ / Fastify |
| **Frontend** | React 18 / Vite / Zustand |
| **Maps** | MapLibre GL JS + OpenStreetMap |
| **UI** | Mantine 7.x |
| **Database** | SQLite / Prisma |
| **Validation** | Zod schemas |
| **Testing** | Vitest + Playwright |
| **Build** | Vite (frontend/backend) |

---

# 🤖 Agent Instructions

## LLM Integration Rules

| Rule | Requirement |
|------|-------------|
| Validation | ALWAYS validate JSON outputs with Zod |
| Token limits | <8k input, <1k output per request |
| Parallelism | Parallel calls for all 25 countries |
| Fallback | `heuristicAI()` if LLM fails 3x |
| Immutability | NEVER mutate WorldState directly |

## Prompt Templates

| Agent | Prompt Start |
|-------|--------------|
| **CountryAgent** | "You are [COUNTRY] leader. Given YOUR belief state..." |
| **AdvisorAgent** | "You are [ROLE] advisor. Player asks..." |
| **NarrativeAgent** | "Write neutral newspaper headline for..." |

## Performance Guardrails

- Turn resolution **MUST** be <200ms (25 countries)
- Profile with `npm run perf` after each system
- If >150ms → **Optimize before next feature**

---

# 🛑 Handling Blockers

## Minor Ambiguity → Continue

1. Make smallest reasonable assumption
2. Document in PROGRESS.md: `"Assumed X per SPEC.md Y"`
3. Add TODO comment in code
4. Proceed

## Hard Blocker → STOP

| Blocker | Action |
|---------|--------|
| Cannot run `npm run dev` | STOP |
| Tests consistently fail (>10% red) | STOP |
| SPEC.md contradiction found | STOP |
| LLM returns invalid JSON >5 attempts | STOP |

**Output final status + blocker details to PROGRESS.md**

---

# 🐛 Bug Workflow

## When User Reports Bugs:

### 1️⃣ Document in TASKS.md
```markdown
## P0 Bugs: Critical Fixes for MVP
- [ ] BUG-001: [Description]
  - Root cause: ...
  - Acceptance criteria: ...
  - Category: Map | Game Flow | Data | Performance
```

### 2️⃣ Update SPEC.md When Fixing Reveals:
- Missing feature specifications
- Ambiguous requirements
- New features needed for game flow
- Implementation notes for future reference

### 3️⃣ Fix → Verify → Commit
```
1. Implement fix
2. Run verification loop
3. Mark bug as [x] in TASKS.md
4. Update SPEC.md if needed
5. Commit: fix: <description> (BUG-XXX)
```

### 4️⃣ Track in PROGRESS.md
```markdown
### BUG-001: Map marker lag
- Root cause: DOM markers vs native layers
- Fix: Migrated to MapLibre GeoJSON layers
- SPEC.md updated: Section 4.2 Map Layers
```

## Bug Priority

| Priority | Description |
|----------|-------------|
| **P0** | Blocks MVP release: fix immediately |
| **P1** | Annoying but playable: fix after P0 |
| **P2** | Minor polish: post-MVP |

---

# 🎉 Success Criteria

| Criteria | Target |
|----------|--------|
| 🌍 World simulation | 25 countries, deterministic |
| 🎮 Campaign length | 2-year (24 turns) playable |
| 🗺️ Map features | Intel overlays + country status |
| 🤖 AI behavior | Plausible diplomatic/military moves |
| 🏆 Endgame | Leadership score + report generated |
| 💾 Persistence | Save/load works perfectly |
| ⚡ Performance | Smooth on mid-range laptop |

---

<div align="center">

**This plan turns Windsurf into a disciplined engineering team.**

*Execute top-to-bottom. Report progress in PROGRESS.md. Ship MVP.*

</div>
