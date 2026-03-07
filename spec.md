spec.md: World Conflicts
1. Product Overview
1.1 Vision
World Conflicts is a deterministic, turn-based global political-military simulation where players lead any country through diplomacy, economics, military strategy, and intelligence operations in a living world of autonomous AI-driven nations. Each country operates from its own imperfect worldview, creating realistic miscalculations, escalations, and opportunities.

*Inspired by the 1990 classic "Conflict: Middle East Political Simulator" - we preserve its tongue-in-cheek realpolitik while expanding to global scope with modern AI-driven country behavior.*

1.2 Design Pillars
1. **Global Agentic Simulation**: Every country runs as an autonomous agent with persistent goals, beliefs, historical patterns, and decision-making capacity that reflects its real-world national character

2. **Asymmetric Information**: Nations see different versions of reality based on intelligence capabilities and biases - players only see what their country believes, not ground truth

3. **Consequential Actions**: Every player decision has visible, cascading consequences shown BEFORE commitment - actions feel weighty and meaningful

4. **Historical Plausibility**: Countries behave according to historical patterns, institutional constraints, and cultural traits - the simulation produces believable alternate histories

5. **Fast Monthly Turns**: Complete turn resolution <200ms for MVP scale (25 countries)

6. **Leadership Legacy**: Comprehensive end-of-term scoring and historical report generation

7. **Scalable World Model**: Tiered country simulation (Tier 1 fully autonomous → Tier 3 abstracted)

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
✅ Phase-based turn flow (News → Briefing → Diplomacy → Military → Domestic → Confirm)
✅ 7-level diplomatic hierarchy (Military Pact → War)
✅ Diplomacy system with action costs and consequence previews
✅ Basic military system (procurement, manpower, airpower, war resolution)
✅ Economy system (GDP growth, military budget allocation)
✅ Internal stability system (public approval, regime legitimacy)
✅ Asymmetric intelligence (belief states vs ground truth)
✅ 2D political world map with 5 overlay layers + fog-of-information
✅ Newspaper-style monthly event summaries (shown at turn START)
✅ Advisor chat system (LLM-driven with departmental bias)
✅ Action consequence preview system
✅ Post-action feedback with cascading effects
✅ Event response dialogs for major crises
✅ Save/load system (SQLite)
✅ Comprehensive leadership scoring
✅ End-of-term historical report generation
✅ Leadership backstory generation
✅ Deterministic simulation (seed-based)

2.2 Phase 2 Features
text
⏳ Nuclear weapons/escalation (Two-Strike Rule, MAD)
⏳ Covert operations (destabilize, support rebels, assassination, coups)
⏳ Insurgency system with policing tactics
⏳ Arms supplier system (USA/UK/France/Private Dealer)
⏳ Tier 2/3 countries (+25 = 50 total)
⏳ Naval warfare
⏳ Enhanced country profiles with full historical context

2.3 Phase 3 Features
text
❌ Trade/commerce systems
❌ Multiplayer
❌ Modding support
❌ Factional politics
❌ Real-time elements
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
4.1 Primary Game Loop (Per Turn) - Phase-Based Flow
*Inspired by original Conflict game's strict phase progression*

text
TURN START:
1. Newspaper Summary (events from PREVIOUS turn - sets context)
2. Briefing Phase (advisor alerts, urgent matters requiring attention)

DECISION PHASES (sequential, cannot go back):
3. Diplomacy Phase (relations overview, alliance requests, treaties)
4. Intelligence Phase (covert ops, intel gathering) [Optional]
5. Military Phase (procurement, deployments, strikes) [If relevant]
6. Domestic Phase (stability, budget, reforms)

TURN END:
7. Confirmation Screen (review all queued actions)
8. Execute Turn (resolution, AI actions, world updates)
9. → Next turn begins with new Newspaper

Key Design Principles:
- Newspaper FIRST (not last) - creates narrative continuity
- Phase progression is LINEAR - no going back once advanced
- Each phase shows relevant info + available actions
- Consequences previewed BEFORE confirmation
- Post-action feedback shows what happened
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
6.3 CountryState Structure (Enhanced)
typescript
interface CountryState {
  id: string;
  name: string;
  iso3: string;
  
  // ============ POLITICAL SYSTEM ============
  politicalSystem: {
    type: 'PARLIAMENTARY' | 'PRESIDENTIAL' | 'AUTHORITARIAN' | 'MONARCHY' | 'THEOCRACY' | 'COMMUNIST' | 'MILITARY_JUNTA';
    powerCenters: ('EXECUTIVE' | 'LEGISLATURE' | 'MILITARY' | 'PARTY' | 'RELIGIOUS' | 'MONARCHY')[];
    electionCycle: number;        // years, 0 for non-democracies
    nextElection?: string;        // YYYY-MM
    rulingParty?: string;
  };
  regimeType: RegimeType;         // Simplified for display
  legitimacy: number;             // 0-100
  
  // ============ HISTORICAL CONTEXT ============
  history: {
    keyEvents: { year: number; event: string; impact: string }[];
    historicalRivals: string[];   // Country IDs
    historicalAllies: string[];   // Country IDs
    sphereOfInfluence: string[];  // Countries they consider in their sphere
    foreignPolicyOrientation: 'EXPANSIONIST' | 'DEFENSIVE' | 'ISOLATIONIST' | 'INTERVENTIONIST';
  };
  
  // ============ NATIONAL CHARACTER ============
  personality: {
    warPropensity: number;        // 0-100: How likely to start wars
    allianceLoyalty: number;      // 0-100: Honor commitments
    diplomaticFlexibility: number;// 0-100: Willingness to negotiate
    ideologicalRigidity: number;  // 0-100: Ideology over pragmatism
    internationalNormsRespect: number; // 0-100
    nationalPride: number;        // 0-100
    redLines: string[];           // Actions that trigger strong response
  };
  riskTolerance: number;          // 0-100
  
  // ============ INTERNAL DIVISIONS ============
  internalDivisions: {
    ethnic: { group: string; percentage: number; tension: number }[];
    religious: { group: string; percentage: number; tension: number }[];
    ideological: { faction: string; strength: number }[];
  };
  insurgencyLevel: 'NONE' | 'UNREST' | 'REBELLION' | 'GUERILLA';
  stability: number;              // 0-100
  
  // ============ ECONOMY ============
  economy: {
    gdp: number;
    growthRate: number;
    sectors: { agriculture: number; industry: number; services: number };
    keyResources: string[];       // oil, gas, minerals, agriculture
    keyExports: string[];
    debtGdpRatio: number;
    developmentLevel: 'DEVELOPED' | 'EMERGING' | 'DEVELOPING';
  };
  gdp: number;                    // Shorthand access
  growthRate: number;
  debtGdpRatio: number;
  militaryBudgetPercent: number;  // 0-20%
  
  // ============ MILITARY ============
  military: {
    manpower: number;
    airpower: number;
    navalPower: number;
    doctrine: 'OFFENSIVE' | 'DEFENSIVE' | 'EXPEDITIONARY' | 'GUERILLA';
    nuclearStatus: 'NONE' | 'LATENT' | 'DEVELOPING' | 'ARMED';
    foreignBases: string[];       // Countries with bases
  };
  manpower: number;               // Shorthand access
  airpower: number;
  mobilizationLevel: number;      // 0-100%
  
  // ============ DIPLOMACY ============
  relations: Record<string, number>;  // -100 to +100
  relationLevel: Record<string, RelationLevel>; // 7-level hierarchy
  alliances: string[];
  atWarWith: string[];
  
  // ============ INTELLIGENCE ============
  intelLevel: number;             // 0-100 (budget/capability)
  beliefState: Partial<WorldState>; // What THIS country believes
  
  // ============ GOALS ============
  goals: Goal[];
}

// 7-Level Diplomatic Hierarchy (from original Conflict)
type RelationLevel = 
  | 'MILITARY_PACT'   // Best: Mutual defense, intel sharing
  | 'PROFITABLE'      // Strong ally, trade benefits
  | 'BENEFICIAL'      // Good relations, cooperation
  | 'FAVOURABLE'      // Positive but limited
  | 'SATISFACTORY'    // Neutral
  | 'LAMENTABLE'      // Poor relations
  | 'WAR';            // Worst: Active conflict

// Thresholds for relation levels
const RELATION_THRESHOLDS = {
  MILITARY_PACT: 80,    // +80 to +100
  PROFITABLE: 60,       // +60 to +79
  BENEFICIAL: 40,       // +40 to +59
  FAVOURABLE: 20,       // +20 to +39
  SATISFACTORY: -20,    // -19 to +19
  LAMENTABLE: -60,      // -59 to -20
  WAR: -100             // -100 to -60 (war eligible)
};
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
8.1 Diplomacy System (Enhanced)
text
7-Level Relationship Hierarchy (from original Conflict):
┌─────────────────┬────────────┬─────────────────────────────────────────┐
│ Level           │ Threshold  │ Mechanics                               │
├─────────────────┼────────────┼─────────────────────────────────────────┤
│ MILITARY_PACT   │ +80 to +100│ Mutual defense, intel sharing, discounts│
│ PROFITABLE      │ +60 to +79 │ Trade benefits, diplomatic support      │
│ BENEFICIAL      │ +40 to +59 │ Cooperation possible, no obligations    │
│ FAVOURABLE      │ +20 to +39 │ Positive but limited engagement         │
│ SATISFACTORY    │ -19 to +19 │ Neutral, no special treatment           │
│ LAMENTABLE      │ -59 to -20 │ Hostile rhetoric, sanctions possible    │
│ WAR             │ -100 to -60│ War eligible, active conflict possible  │
└─────────────────┴────────────┴─────────────────────────────────────────┘

Diplomatic Stances & Costs:
- IMPROVE: Attempt to raise relations. Costs $100M/month from defense budget
- MAINTAIN: No cost, relations drift toward natural equilibrium
- WORSEN: No cost, intentionally degrade for casus belli

Special States:
- "Attack Means Disaster": When all parties in conflict have nuclear weapons
  → Conventional diplomacy suspended, any strike risks global holocaust

Alliance Rules:
- Mutual defense obligation (automatic war declaration)
- Intelligence sharing (+20 intel accuracy on shared targets)
- Joint military procurement discounts (-15% cost)
- Alliance betrayal: -40 relations with ALL allies, -20 global prestige
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

8.5 Intelligence System
text
Intel Budget: Percentage of GDP allocated to intelligence (0.5% - 3%)
Intel Level: 0-100 (determines accuracy of belief states)

Covert Operations:
┌─────────────────┬─────────────┬────────────────────────────────────────┐
│ Operation       │ Cost/Month  │ Effect                                 │
├─────────────────┼─────────────┼────────────────────────────────────────┤
│ GATHER_INTEL    │ $50M        │ +10 intel accuracy on target           │
│ DESTABILIZE     │ $100M       │ Target stability -5 to -15/month       │
│ SUPPORT_REBELS  │ $150M       │ Creates/escalates insurgency           │
│ COUNTER_INTEL   │ $75M        │ +20 defense against enemy ops          │
│ SABOTAGE        │ $200M       │ Target GDP -1%, infrastructure damage  │
│ ASSASSINATION   │ $300M       │ If target leader weak, regime change   │
│ COUP            │ $500M       │ If target has Guerilla insurgency      │
└─────────────────┴─────────────┴────────────────────────────────────────┘

Operation Success Formula:
  success_chance = (your_intel / 100) × (1 - target_counter_intel / 100) × base_chance
  
Consequences of Failure:
- 30% chance operation exposed → diplomatic incident
- Relations with target: -30
- Relations with target's allies: -15
- Global prestige: -10

8.6 Internal Affairs System
text
Insurgency Levels:
┌─────────────┬────────────────┬─────────────────────────────────────────┐
│ Level       │ Stability Cost │ Description                             │
├─────────────┼────────────────┼─────────────────────────────────────────┤
│ NONE        │ 0              │ No active insurgency                    │
│ UNREST      │ -3/month       │ Protests, strikes, civil disobedience   │
│ REBELLION   │ -8/month       │ Armed resistance, regional control loss │
│ GUERILLA    │ -15/month      │ Full insurgency, coup/collapse risk     │
└─────────────┴────────────────┴─────────────────────────────────────────┘

Policing Tactics (Soft vs Hard):
┌─────────────┬─────────────────────────────────────────────────────────┐
│ SOFT        │ Slow resolution (-1 insurgency/3 months)                │
│             │ No international backlash                               │
│             │ Costs legitimacy (-2/month)                             │
├─────────────┼─────────────────────────────────────────────────────────┤
│ HARD        │ Fast resolution (-1 insurgency/month)                   │
│             │ International outcry (relations with democracies -10)  │
│             │ US aid reduced by 50%                                   │
│             │ Global prestige -5/month                                │
└─────────────┴─────────────────────────────────────────────────────────┘

Internal Challenges:
- Separatist movements (ethnic/regional)
- Economic protests (triggered by negative growth)
- Political opposition (triggered by low legitimacy)
- Corruption scandals (random events)
- Military discontent (triggered by budget cuts during war)

Response Options:
- NEGOTIATE: Slow, sustainable, costs legitimacy
- REFORM: Expensive but effective, improves long-term
- SUPPRESS: Fast but international backlash
- IGNORE: Challenge escalates over time

8.7 Arms Supplier System
text
Global Arms Market (from original Conflict):
┌─────────────────┬─────────────────────────────────────────────────────┐
│ Supplier        │ Characteristics                                     │
├─────────────────┼─────────────────────────────────────────────────────┤
│ USA             │ High-tech (F-16, M1 Abrams, AWACS)                  │
│                 │ Requires: Relations ≥ BENEFICIAL                    │
│                 │ Sensitive to: Human rights record, democracy        │
│                 │ Embargo trigger: Hard policing, WMD use             │
├─────────────────┼─────────────────────────────────────────────────────┤
│ UK              │ Reliable middle-ground hardware                     │
│                 │ Requires: Relations ≥ FAVOURABLE                    │
│                 │ Follows US embargo decisions                        │
├─────────────────┼─────────────────────────────────────────────────────┤
│ France          │ Pragmatic, ignores ideology                         │
│                 │ Requires: Relations ≥ SATISFACTORY                  │
│                 │ Sells to anyone with money                          │
├─────────────────┼─────────────────────────────────────────────────────┤
│ Russia          │ Alternative to Western suppliers                    │
│                 │ Requires: Relations ≥ SATISFACTORY                  │
│                 │ Buying locks out US/UK suppliers                    │
├─────────────────┼─────────────────────────────────────────────────────┤
│ Private Dealer  │ Exclusive source during embargoes                   │
│                 │ No requirements, 50% markup                         │
│                 │ T-62s, MiG-27s, older equipment                     │
└─────────────────┴─────────────────────────────────────────────────────┘

Supplier Loyalty: Consistent purchasing unlocks better equipment tiers

8.8 Nuclear System (Phase 2)
text
Nuclear Program Stages:
1. NONE: No program
2. LATENT: Civilian nuclear capability, could weaponize
3. DEVELOPING: Active weapons program ($20M/month to fund)
4. ARMED: Operational nuclear weapons

The Two-Strike Rule:
- Nuclear facility can be crippled by airstrikes BEFORE testing
- Requires TWO successful consecutive strikes
- Once "Mushroom Cloud" icon appears (tested), invulnerable to conventional strikes

Nuclear Use Consequences:
- Instant victory possible BUT:
- 70% chance of retaliatory chain reaction → Global Holocaust (Game Over)
- Immediate global arms embargo
- Relations with ALL countries: -50
- Global prestige: 0

"Attack Means Disaster" State:
- Triggered when all parties in conflict have operational nukes
- Conventional diplomacy suspended
- Any military action risks escalation to nuclear exchange
9. Player Engagement & Feedback Systems

9.1 Action Consequence Preview
text
Before any action is confirmed, show player:
┌─────────────────────────────────────────────────────────────────────────┐
│ ACTION: Deploy troops to Iranian border                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ IMMEDIATE EFFECTS:                                                      │
│ • Mobilization: +15%                                                    │
│ • Defense budget: -$200M                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ DIPLOMATIC CONSEQUENCES:                                                │
│ • Iran: -15 relations (now: LAMENTABLE)                                │
│ • Russia: -5 relations (ally of Iran)                                  │
│ • Israel: +5 relations (appreciates pressure)                          │
│ • Global Tension: +3 (now: 58%)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ ⚠️ WARNING: Iran may retaliate next turn                               │
│ ⚠️ WARNING: This may trigger alliance obligations                      │
└─────────────────────────────────────────────────────────────────────────┘
│                    [CONFIRM]  [CANCEL]                                  │
└─────────────────────────────────────────────────────────────────────────┘

9.2 Post-Action Feedback Modal
text
After turn resolution, show cascading effects:
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 TURN 5 RESULTS                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ YOUR ACTIONS:                                                           │
│ ✓ Troops deployed to Iranian border                                    │
│   → Iran relations: -15 (now: LAMENTABLE)                              │
│   → Russia issued condemnation (-5)                                    │
│   → Israel praised the move (+5)                                       │
│   → Global tension: +3 (now: 58%)                                      │
│                                                                         │
│ WORLD REACTIONS:                                                        │
│ • Iran mobilized forces in response                                    │
│ • Russia proposed emergency UN session                                 │
│ • China remained neutral but concerned                                 │
│                                                                         │
│ CASCADING EFFECTS:                                                      │
│ • Oil prices increased 5% (your GDP +0.2%)                             │
│ • NATO allies expressed support                                        │
└─────────────────────────────────────────────────────────────────────────┘

9.3 Event Response Dialogs
text
Major events require player response (not just notifications):
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ CRISIS: China mobilizing on Taiwan border                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Intelligence reports 500,000 troops massing near the Taiwan Strait.    │
│ Invasion appears likely within 2 months.                               │
│                                                                         │
│ Your Response:                                                          │
│ ┌─────────────────┐ ┌─────────────────┐                                │
│ │ Condemn Publicly│ │ Private Warning │                                │
│ │ Relations: -20  │ │ Relations: -5   │                                │
│ │ Prestige: +5    │ │ Prestige: 0     │                                │
│ └─────────────────┘ └─────────────────┘                                │
│ ┌─────────────────┐ ┌─────────────────┐                                │
│ │ Mobilize Forces │ │ Do Nothing      │                                │
│ │ Tension: +10    │ │ Taiwan: -15     │                                │
│ │ Cost: $500M     │ │ Prestige: -10   │                                │
│ └─────────────────┘ └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────┘

9.4 War Progress Visualization
text
When at war, sidebar shows tug-of-war indicator:
┌─────────────────────────────────────────────────────────────────────────┐
│ WAR: USA vs IRAN (Month 3)                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ Territory Control:                                                      │
│ USA ████████████░░░░░░░░ IRAN                                          │
│     65%              35%                                                │
│                                                                         │
│ Casualties:                                                             │
│ USA: 12,400 killed    IRAN: 45,200 killed                              │
│                                                                         │
│ War Weariness:                                                          │
│ USA: 23%              IRAN: 67%                                        │
│                                                                         │
│ [Propose Ceasefire]                                                     │
└─────────────────────────────────────────────────────────────────────────┘

9.5 Advisor Bias System
text
Each advisor has institutional bias affecting their recommendations:

Foreign Minister:
- Bias: Diplomatic solutions, alliance preservation
- Blind spots: Military necessity, domestic politics
- Example: "We should negotiate, war would damage our alliances"

Defense Minister:
- Bias: Military strength, deterrence
- Blind spots: Economic costs, diplomatic fallout
- Example: "We need to mobilize now, show strength"

Intelligence Chief:
- Bias: Covert solutions, information gathering
- Blind spots: Public opinion, legitimacy
- Example: "We could destabilize them quietly"

Treasury Secretary:
- Bias: Economic stability, budget constraints
- Blind spots: Security threats, prestige
- Example: "We can't afford another war"

Advisors see only their department's belief state, not full picture.
Player must synthesize conflicting advice.

10. Historical Realism & Country Behavior

10.1 Country-Specific AI Behavior
text
Each country agent uses personality traits to make decisions:

Decision Formula:
  action_score = base_utility 
    × (1 + personality.warPropensity / 100)      // if military action
    × (1 + personality.allianceLoyalty / 100)    // if alliance-related
    × (1 - personality.riskTolerance / 100)      // if risky action
    × historical_pattern_modifier                 // based on past behavior

Historical Pattern Modifiers:
- If action matches historical behavior: ×1.5
- If action contradicts historical behavior: ×0.5
- If action crosses a "red line": immediate strong response

Example - USA Behavior:
- High interventionism → likely to respond to threats to allies
- High alliance loyalty → will honor NATO commitments
- Red lines: Attack on NATO ally, nuclear proliferation
- Historical pattern: Sanctions before military action

Example - Russia Behavior:
- Defensive orientation → aggressive when sphere threatened
- Low international norms respect → willing to use force
- Red lines: NATO expansion, Ukraine alignment
- Historical pattern: Hybrid warfare, deniable operations

10.2 Institutional Constraints
text
Countries face different constraints based on regime type:

DEMOCRACIES:
- Election pressure: Must maintain approval before elections
- Legislative approval: War declarations need support (stability > 50)
- Media scrutiny: Actions become public, harder to hide
- Coup immunity: Cannot be couped (only voted out)

AUTOCRACIES:
- Elite loyalty: Must keep military/party happy
- Coup risk: Low legitimacy + military discontent = coup chance
- Repression costs: Stability through force has limits
- No elections: But legitimacy still matters

THEOCRACIES:
- Religious mandate: Actions must align with doctrine
- Clerical approval: Religious leaders can veto
- Ideological rigidity: Less diplomatic flexibility
- Legitimacy from faith: Different stability dynamics

MILITARY JUNTAS:
- Military budget priority: Must maintain high spending
- Internal rivalries: Factions compete for power
- Coup risk: Very high if military unhappy
- Short-term focus: Less long-term planning

10.3 Historical Event Templates
text
Crisis scenarios based on real historical precedents:

CUBAN_MISSILE_CRISIS_TEMPLATE:
- Trigger: Nuclear weapons placed near superpower
- Escalation path: Blockade → Ultimatum → Brinkmanship
- Resolution options: Negotiated withdrawal, war, MAD
- Historical outcome: Negotiated resolution

SUEZ_CRISIS_TEMPLATE:
- Trigger: Regional power nationalizes strategic asset
- Escalation path: Diplomatic protest → Military intervention
- Resolution options: UN intervention, superpower pressure
- Historical outcome: Colonial powers forced to withdraw

GULF_WAR_TEMPLATE:
- Trigger: Invasion of smaller neighbor
- Escalation path: Sanctions → Coalition building → Liberation
- Resolution options: Withdrawal, limited war, regime change
- Historical outcome: Coalition victory, limited objectives

These templates guide AI behavior and create plausible scenarios.

10.4 Leadership Backstory Generation
text
On game start, generate rise-to-power narrative:

Input: Country, regime type, starting year, recent events
Output: 2-3 paragraph backstory + initial conditions

Example (USA, Democracy, 1997):
"Following a narrow victory in the 1996 election, you assumed office 
amid economic optimism but growing concerns about terrorism. Your 
predecessor's foreign policy of engagement with China and Russia faces 
criticism from hawks in Congress. The military, fresh from Gulf War 
success, expects continued investment..."

Initial Conditions Set:
- Legitimacy: 65 (narrow mandate)
- Military relations: 70 (expects investment)
- Key challenge: Balance engagement vs. hawkish pressure

11. Data Contracts
11.1 Save File Format
json
{
  "version": "1.0",
  "worldState": WorldState,
  "playerCountry": "USA",
  "seed": 123456,
  "turnLog": TurnLog[]
}

11.2 Newspaper Entry Format
json
{
  "headline": "China declares war on Taiwan",
  "description": "After failed negotiations, Beijing launched full invasion...",
  "relatedCountries": ["CHN", "TWN"],
  "impact": "GLOBAL_TENSION +15"
}
12. UI/UX Requirements
12.1 Map Layers (Toggleable)
text
1. Political: Country borders, capitals, regime colors
2. Military: Troop concentrations, war zones, alliances
3. Economic: GDP heatmap, trade flows
4. Stability: Stability heatmap (green→red)
5. Intelligence: Fog of war (player's intel view)

12.1.1 Map Layer Implementation (Technical Requirements)
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

12.1.2 Map Legend (Dynamic)
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
12.2 Screen States
text
- Newspaper Brief (full screen, auto-advance)
- World Dashboard (map + country panels)
- Action Selection (tabbed interface)
- Advisor Chat (split screen)
- Resolution Summary (headline reel)
- End Game Report (multi-page)
13. Performance Targets
text
MVP (25 countries):
- Turn resolution: <200ms
- Map render: <100ms
- Save game: <500ms
- Load game: <1s

Stretch (50 countries):
- Turn resolution: <500ms

14. High-Level Architecture
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
15. Tech Stack (Locked)
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
15.1 LLM Providers (Pluggable)
text
Primary: OpenAI GPT-4o / Anthropic Claude 3.5 (remote APIs)
Fallback: Ollama local models (Llama 3.1, Mistral)
Emergency: Heuristic rules
16. Testing Strategy
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
17. Definition of Done (MVP)
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
