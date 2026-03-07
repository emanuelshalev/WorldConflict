spec.md: World Conflicts
1. Product Overview
1.1 Vision
World Conflicts is a deterministic, turn-based global political-military simulation where players lead any country through diplomacy, economics, military strategy, and intelligence operations in a living world of autonomous AI-driven nations. Each country operates from its own imperfect worldview, creating realistic miscalculations, escalations, and opportunities.

1.2 Design Pillars
Global Agentic Simulation: Every country runs as an autonomous agent with persistent goals, beliefs, and decision-making capacity

Asymmetric Information: Nations see different versions of reality based on intelligence capabilities and biases

Fast Monthly Turns: Complete turn resolution <200ms for MVP scale (25 countries)

Leadership Legacy: Comprehensive end-of-term scoring and historical report generation

Scalable World Model: Tiered country simulation (Tier 1 fully autonomous → Tier 3 abstracted)

1.3 Target Platforms
Primary: Desktop web application (Chrome, Firefox, Safari, Edge)

Secondary: Progressive Web App (PWA) for offline play

Stretch: Native desktop via Tauri/Electron

1.4 Target Audience
Strategy gamers, geopolitical enthusiasts, political science students, 4X players seeking deeper diplomatic systems

2. MVP Scope Definition
2.1 MVP Includes (Phase 1)
text
✅ 25 Tier 1 countries with full autonomous agents
✅ Monthly turn system (1 month = 1 turn)
✅ Diplomacy system (relations matrix, alliances, war declarations)  
✅ Basic military system (procurement, manpower, airpower, simple war resolution)
✅ Economy system (GDP growth, military budget allocation)
✅ Internal stability system (public approval, regime legitimacy)
✅ Asymmetric intelligence (belief states vs ground truth)
✅ 2D political world map with 5 overlay layers
✅ Newspaper-style monthly event summaries
✅ Advisor chat system (LLM-driven conversations)
✅ Save/load system (SQLite)
✅ Comprehensive leadership scoring
✅ End-of-term historical report generation
✅ Deterministic simulation (seed-based)
2.2 MVP Explicitly Excludes (Future Phases)
text
❌ Nuclear weapons/escalation (Phase 2)
❌ Insurgencies/terrorism/coups (Phase 2) 
❌ Tier 2/3 countries (Phase 2)
❌ Naval warfare (Phase 2)
❌ Trade/commerce systems (Phase 3)
❌ Multiplayer (Phase 3)
❌ Modding support (Phase 3)
❌ Factional politics (Phase 3)
❌ Real-time elements (Phase 3)
3. Tiered Country Classification
3.1 Tier 1: Core Players (25 countries)
Always fully autonomous with complete state tracking

text
Global Superpowers (5):
├── United States
├── China  
├── Russia
├── Germany (EU anchor)
└── India

Regional Powers by Geography:
├── Americas (3): Brazil, Canada, Mexico
├── Europe (4): France, UK, Poland, Turkey
├── Middle East (4): Saudi Arabia, Iran, Israel, Egypt  
├── Asia-Pacific (4): Japan, Indonesia, South Korea, North Korea
└── Player's country (always Tier 1)
3.2 Tier 2: Regional Influencers (Phase 2, +25 = 50 total)
Semi-autonomous with simplified logic templates

3.3 Tier 3: Background States (~145)
Passive simulation via group behaviors and dynamic promotion

4. User Flows
4.1 Primary Game Loop (Per Turn)
text
1. Monthly Newspaper Summary Screen (3s auto-advance)
2. World Map Dashboard (inspect countries, intel overlays)
3. Action Menu (Diplomacy | Military | Economy | Intelligence)
4. [Optional] Advisor Consultation (chat interface)
5. Action Confirmation & End Turn
6. Resolution Summary (headline reel)
7. Next turn begins
4.2 New Game Flow
text
1. Choose Starting Year (1950-2025, 5-year increments)
2. Choose Country (from Tier 1 list)
3. Generated Leadership Backstory (narrative + initial legitimacy)
4. First Turn Briefing
4.3 Save/Load Flow
text
Save: Current → Snapshot → SQLite
Load: List → Select → Validate → Resume
5. UI States (Explicit Requirements)
5.1 Loading States
text
- Initial game boot (country data, world state)
- AI decision processing ("Computing world reactions...")
- Turn resolution ("Resolving month X...")
- Save/load operations
5.2 Error States
text
- Failed save/load → "Save corrupted. Create new game?"
- LLM response invalid → "AI temporarily unavailable. Using backup logic."
- State corruption → Emergency save + restart
- API failure → Offline mode warning
5.3 Empty States
text
- No active wars → "World at peace"
- No alliances → "Diplomatic isolation"
- No available actions → "Quiet month ahead"
6. Core Simulation Model
6.1 Determinism Requirements
Simulation MUST be deterministic given:

text
WorldState snapshot + Seed + Player actions + AI intents
No network calls during resolution. Pure computation.

6.2 WorldState Structure
typescript
interface WorldState {
  turn: number;
  date: Date;           // YYYY-MM
  countries: CountryState[];
  wars: ActiveWar[];
  globalTension: number; // 0-100
  eventQueue: Event[];
  seed: number;
  playerCountryId: string;
}
6.3 CountryState Structure
typescript
interface CountryState {
  id: string;
  name: string;
  
  // Economy
  gdp: number;
  growthRate: number;
  debtGdpRatio: number;
  militaryBudgetPercent: number; // 0-20%
  
  // Military
  manpower: number;
  airpower: number;
  mobilizationLevel: number; // 0-100%
  
  // Diplomacy (matrix with other countries)
  relations: Record<string, number>; // -100 to +100
  alliances: string[];
  atWarWith: string[];
  
  // Internal
  stability: number;     // 0-100
  regimeType: RegimeType;
  legitimacy: number;    // 0-100
  
  // Intelligence & Beliefs
  intelLevel: number;    // 0-100 (budget/capability)
  beliefState: Partial<WorldState>; // What THIS country believes
  
  // Goals & Personality
  goals: Goal[];
  riskTolerance: number; // 0-100
}
6.4 Turn Lifecycle (Canonical Order)
text
1. Event Injection (random + triggered events)
2. Intelligence Update (belief states refresh)
3. AI Intent Generation (all countries decide actions)
4. Player Action Submission (overridden for player country)
5. Action Validation (schema + rules checks)
6. Resolution Phase (ONLY mutations happen here)
7. Metrics Update (GDP, stability, relations)
8. Newspaper Generation
9. Advance Turn (turn++, date++)
7. Agent System Specification
7.1 Agent Contract
typescript
interface CountryIntent {
  countryId: string;
  actions: Action[];     // Validated against schema
  reasoning?: string;    // Optional, for debug
}
7.2 Agent Constraints
text
✅ Operate ONLY on country's BeliefState
✅ Respect budget constraints
✅ Honor alliance commitments  
✅ Cannot access GroundTruth
✅ Cannot directly mutate state
✅ Structured JSON output only
7.3 Agent Types
text
1. CountryAgent: Generates CountryIntent for autonomous nations
2. AdvisorAgent: Generates chat responses for player advisors
3. NarrativeAgent: Generates backstories, newspaper headlines
7.4 LLM Integration Rules
text
- Abstract LlmClient interface
- Structured output validation (JSON Schema / Zod)
- Fallback to heuristic AI if LLM fails
- Token limits per request (<8k input, <1k output)
- Parallel processing for all countries
8. Core Systems Specification
8.1 Diplomacy System
text
Relations: -100 (War) → +100 (Ironclad Ally)
Thresholds:
- -60 → War eligible
- -20 → Hostile
- +20 → Friendly  
- +60 → Alliance eligible
- +80 → Military Pact

Alliance Rules:
- Mutual defense obligation
- Intelligence sharing
- Joint military procurement discounts
8.2 War System
text
Monthly Resolution:
1. Force comparison (manpower × mobilization × tech)
2. Casualty calculation (mutual losses)
3. War progress bar (0-100% territory control)
4. Attrition effects (GDP -2%/month, stability -5/month)

Ceasefire: Either side can propose
- Relations reset to -20
- 60% chance of re-escalation within 3 turns
8.3 Economy System
text
Monthly Update:
GDP_next = GDP_current × (1 + growthRate - warPenalty)
growthRate = baseGrowth - instabilityEffect - debtDrag

Military Budget: GDP × militaryBudgetPercent
Available for procurement each turn
8.4 Stability System
text
Monthly Update:
stability_next = stability_current + delta

Deltas from:
- War participation: -8 to -15/month
- Economic growth: +growthRate × 2
- Successful diplomacy: +2 to +5
- Regime type modifier: Democracy (+stability), Autocracy (-volatility)

stability <= 0 → Government Collapse (game over for that leader)
9. Data Contracts
9.1 Save File Format
json
{
  "version": "1.0",
  "worldState": WorldState,
  "playerCountry": "USA",
  "seed": 123456,
  "turnLog": TurnLog[]
}
9.2 Newspaper Entry Format
json
{
  "headline": "China declares war on Taiwan",
  "description": "After failed negotiations, Beijing launched full invasion...",
  "relatedCountries": ["CHN", "TWN"],
  "impact": "GLOBAL_TENSION +15"
}
10. UI/UX Requirements
10.1 Map Layers (Toggleable)
text
1. Political: Country borders, capitals, regime colors
2. Military: Troop concentrations, war zones, alliances
3. Economic: GDP heatmap, trade flows
4. Stability: Stability heatmap (green→red)
5. Intelligence: Fog of war (player's intel view)

10.1.1 Map Layer Implementation (Technical Requirements)
text
CRITICAL: Use MapLibre native GeoJSON layers, NOT DOM markers
- DOM markers cause lag during pan/zoom (markers don't sync with tiles)
- GeoJSON source + circle/symbol layers render in WebGL with map tiles
- All country data rendered as single GeoJSON FeatureCollection

Layer Visualization Details:
┌─────────────┬──────────────────────────────────────────────────────────┐
│ Layer       │ Visualization                                            │
├─────────────┼──────────────────────────────────────────────────────────┤
│ Political   │ - Circle color = regime type                             │
│             │   (Democracy=#4CAF50, Autocracy=#F44336, Communist=#E91E63│
│             │    Monarchy=#9C27B0, Theocracy=#FF9800)                   │
│             │ - Circle size = relative power (GDP + Military)          │
│             │ - Label = Country name + regime icon                     │
├─────────────┼──────────────────────────────────────────────────────────┤
│ Military    │ - Circle color = military strength gradient (red scale)  │
│             │ - Circle size = manpower (scaled logarithmically)        │
│             │ - Label = Troop count (e.g., "1.4M troops")              │
│             │ - War indicators: pulsing red border for countries at war│
├─────────────┼──────────────────────────────────────────────────────────┤
│ Economic    │ - Circle color = GDP gradient (green scale)              │
│             │ - Circle size = GDP (scaled logarithmically)             │
│             │ - Label = GDP formatted (e.g., "$25.5T", "$2.1T")        │
│             │ - Growth indicator: up/down arrow with growth %          │
├─────────────┼──────────────────────────────────────────────────────────┤
│ Stability   │ - Circle color = stability gradient (green→yellow→red)   │
│             │ - Circle size = uniform (stability is internal metric)   │
│             │ - Label = Stability % (e.g., "75% Stable")               │
│             │ - Warning icon for stability < 40%                       │
├─────────────┼──────────────────────────────────────────────────────────┤
│ Intelligence│ - Circle opacity = player's intel coverage on that nation│
│             │ - Unknown nations: gray, blurred, "?" label              │
│             │ - Known nations: full color, detailed info               │
│             │ - Player's nation: always full visibility, blue highlight│
└─────────────┴──────────────────────────────────────────────────────────┘

10.1.2 Map Legend (Dynamic)
text
Legend panel positioned bottom-right of map, updates on layer switch:

Political Legend:
  ● Democracy (green)
  ● Autocracy (red)
  ● Communist (pink)
  ● Monarchy (purple)
  ● Theocracy (orange)
  ★ Player's Nation (gold border)
  ⚔ At War (red border)
  🤝 Allied (green border)

Military Legend:
  Scale: ○ < 100K │ ◐ 100K-500K │ ● 500K-1M │ ⬤ > 1M troops
  Color: Light red (weak) → Dark red (superpower)

Economic Legend:
  Scale: GDP ranges with color gradient
  $0-1T │ $1-5T │ $5-15T │ $15T+
  ↑ Growing │ ↓ Declining

Stability Legend:
  🟢 80-100% Stable
  🟡 50-79% Moderate
  🟠 25-49% Unstable
  🔴 0-24% Critical

Intelligence Legend:
  ◯ No Intel (0-20%)
  ◔ Limited (21-50%)
  ◑ Moderate (51-75%)
  ● Full Intel (76-100%)
10.2 Screen States
text
- Newspaper Brief (full screen, auto-advance)
- World Dashboard (map + country panels)
- Action Selection (tabbed interface)
- Advisor Chat (split screen)
- Resolution Summary (headline reel)
- End Game Report (multi-page)
11. Performance Targets
text
MVP (25 countries):
- Turn resolution: <200ms
- Map render: <100ms
- Save game: <500ms
- Load game: <1s

Stretch (50 countries):
- Turn resolution: <500ms
12. High-Level Architecture
text
src/
├── core/              # Pure deterministic logic ⭐ NO LLM/IO
│   ├── world.ts
│   ├── country.ts
│   ├── turn.ts
│   ├── systems/       # diplomacy, war, economy, stability
│   └── validation.ts
├── agents/            # LLM integration layer
│   ├── llmClient.ts
│   ├── countryAgent.ts
│   ├── advisorAgent.ts
│   └── prompts/
├── data/              # Static JSON
│   ├── countries/
│   ├── scenarios/
│   └── events/
├── api/               # HTTP transport
│   ├── server.ts
│   └── routes/
├── ui/                # React SPA
│   ├── components/
│   ├── map/
│   └── store/
└── infra/             # DB, config
    ├── db.ts
    └── config.ts
13. Tech Stack (Locked)
text
Language: TypeScript (strict mode)
Backend: Node.js 20+ / Fastify
Frontend: React 18 / Vite / TypeScript
State: Zustand
Maps: MapLibre GL JS + OpenStreetMap
UI: Mantine (design system)
DB: SQLite (via Prisma)
Validation: Zod (JSON schemas)
Testing: Vitest + React Testing Library + Playwright E2E
Build: Vite (frontend) / tsc + esbuild (backend)
Deployment: Single Node binary OR Docker
13.1 LLM Providers (Pluggable)
text
Primary: OpenAI GPT-4o / Anthropic Claude 3.5 (remote APIs)
Fallback: Ollama local models (Llama 3.1, Mistral)
Emergency: Heuristic rules
14. Testing Strategy
text
Unit Tests (95% coverage required):
- Core simulation logic
- Validation schemas  
- Agent prompt generation

Integration Tests:
- Full turn cycles
- Save/load round trips
- Multi-country interactions

E2E Tests:
- New game → 12 turns → save → load → end game
- All UI flows
15. Definition of Done (MVP)
MVP ships when ALL are true:

text
✅ Player completes 24-turn game without crashes
✅ Simulation 100% deterministic (same seed = same outcome)  
✅ All core systems have >95% unit test coverage
✅ Save/load verified across 100 games
✅ Turn resolution <200ms (25 countries, mid-range hardware)
✅ AI generates valid intents 98%+ of turns
✅ Map renders smoothly (<16ms frame time)
✅ Leadership report generates correctly
✅ Error states handled gracefully
✅ Offline mode functional (no LLM)
