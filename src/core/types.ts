import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const RegimeTypeSchema = z.enum([
  "DEMOCRACY",
  "AUTOCRACY",
  "THEOCRACY",
  "MILITARY_JUNTA",
  "COMMUNIST",
  "MONARCHY",
]);
export type RegimeType = z.infer<typeof RegimeTypeSchema>;

// Detailed political system (drives government dynamics)
export const PoliticalSystemTypeSchema = z.enum([
  "PRESIDENTIAL_DEMOCRACY",
  "PARLIAMENTARY_DEMOCRACY",
  "SEMI_PRESIDENTIAL",
  "ONE_PARTY_STATE",
  "MILITARY_JUNTA",
  "ABSOLUTE_MONARCHY",
  "CONSTITUTIONAL_MONARCHY",
  "THEOCRACY",
  "PERSONALIST_AUTOCRACY",
]);
export type PoliticalSystemType = z.infer<typeof PoliticalSystemTypeSchema>;

export const PowerCenterSchema = z.enum([
  "EXECUTIVE",
  "LEGISLATURE",
  "JUDICIARY",
  "MILITARY",
  "PARTY",
  "RELIGIOUS",
  "MONARCHY",
  "OLIGARCHS",
  "SECURITY_SERVICES",
]);
export type PowerCenter = z.infer<typeof PowerCenterSchema>;

// 7-level diplomatic hierarchy (from spec)
export const DiplomaticLevelSchema = z.enum([
  "MILITARY_PACT", // Best - mutual defense
  "PROFITABLE", // Strong trade, can request alliance
  "BENEFICIAL", // Good relations
  "FAVOURABLE", // Positive
  "SATISFACTORY", // Neutral
  "LAMENTABLE", // Poor
  "WAR", // Worst - active conflict
]);
export type DiplomaticLevel = z.infer<typeof DiplomaticLevelSchema>;

// Insurgency levels (from spec)
export const InsurgencyLevelSchema = z.enum(["NONE", "UNREST", "REBELLION", "GUERILLA"]);
export type InsurgencyLevel = z.infer<typeof InsurgencyLevelSchema>;

// Stability levels (named, from spec)
export const StabilityLevelSchema = z.enum([
  "VERY_SOLID", // 80-100
  "SOLID", // 60-79
  "MODERATE", // 40-59
  "UNSTABLE", // 20-39
  "COLLAPSING", // 0-19
]);
export type StabilityLevel = z.infer<typeof StabilityLevelSchema>;

// Nuclear status. TESTED = publicly demonstrated, invulnerable to conventional strikes.
export const NuclearStatusSchema = z.enum(["NONE", "LATENT", "DEVELOPING", "TESTED", "ARMED"]);
export type NuclearStatus = z.infer<typeof NuclearStatusSchema>;

// Policing tactics (from spec)
export const PolicingTacticSchema = z.enum([
  "SOFT", // Slow but no backlash
  "HARD", // Fast but international outcry
]);
export type PolicingTactic = z.infer<typeof PolicingTacticSchema>;

export const LeaderStyleSchema = z.enum([
  "HAWKISH",
  "DOVISH",
  "PRAGMATIC",
  "REFORMIST",
  "HARDLINER",
]);
export type LeaderStyle = z.infer<typeof LeaderStyleSchema>;

export const LeaderOriginSchema = z.enum([
  "ELECTED",
  "COUP",
  "SUCCESSION",
  "REVOLUTION",
  "APPOINTED",
  "FOUNDING",
]);
export type LeaderOrigin = z.infer<typeof LeaderOriginSchema>;

export const ForeignPolicyOrientationSchema = z.enum([
  "EXPANSIONIST",
  "DEFENSIVE",
  "ISOLATIONIST",
  "INTERVENTIONIST",
  "BALANCING",
  "NON_ALIGNED",
]);
export type ForeignPolicyOrientation = z.infer<typeof ForeignPolicyOrientationSchema>;

export const ActionTypeSchema = z.enum([
  // Diplomacy
  "DIPLOMACY_IMPROVE_RELATIONS",
  "DIPLOMACY_DENOUNCE",
  "DIPLOMACY_PROPOSE_ALLIANCE",
  "DIPLOMACY_BREAK_ALLIANCE",
  "DIPLOMACY_DECLARE_WAR",
  "DIPLOMACY_PROPOSE_CEASEFIRE",
  "DIPLOMACY_MEDIATE", // broker talks between two belligerents (target = one of them)
  // Military
  "MILITARY_MOBILIZE",
  "MILITARY_DEMOBILIZE",
  "MILITARY_PROCURE",
  "MILITARY_AIRSTRIKE", // Pre-war precision strike; params.targetType: MILITARY|INDUSTRIAL|NUCLEAR
  "MILITARY_DEPLOY_BORDER", // Deploy troops to border
  "MILITARY_WITHDRAW_BORDER",
  // Nuclear
  "NUCLEAR_FUND_PROGRAM",
  "NUCLEAR_STRIKE", // Only during war; catastrophic consequences
  // Economy
  "ECONOMY_ADJUST_MILITARY_BUDGET",
  // Intelligence (covert operations)
  "INTEL_GATHER",
  "INTEL_SABOTAGE",
  "INTEL_DESTABILIZE",
  "INTEL_SUPPORT_REBELS",
  "INTEL_COUNTER_INTEL",
  "INTEL_MISINFORMATION",
  "INTEL_PROPAGANDA",
  "INTEL_ASSASSINATE", // Only vs weak/unstable targets
  "INTEL_COUP", // Only vs targets with GUERILLA insurgency or collapsing stability
  // Domestic
  "DOMESTIC_PROPAGANDA",
  "DOMESTIC_REFORM",
  "DOMESTIC_POLICING", // params.tactic: SOFT|HARD
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

// ============================================================================
// Leader & Government
// ============================================================================

export const LeaderSchema = z.object({
  name: z.string(),
  title: z.string(), // "President", "Prime Minister", "Supreme Leader", "General Secretary"...
  style: LeaderStyleSchema,
  origin: LeaderOriginSchema,
  sinceTurn: z.number().default(0),
  sinceDate: z.string().optional(), // YYYY-MM, for pre-game leaders
});
export type Leader = z.infer<typeof LeaderSchema>;

export const PoliticalSystemSchema = z.object({
  type: PoliticalSystemTypeSchema,
  powerCenters: z.array(PowerCenterSchema),
  electionCycleMonths: z.number().min(0).default(0), // 0 = no elections
  nextElectionTurn: z.number().nullable().default(null),
  leaderTitle: z.string().default("Leader"),
});
export type PoliticalSystem = z.infer<typeof PoliticalSystemSchema>;

export const GovernmentChangeKindSchema = z.enum([
  "ELECTION",
  "COUP",
  "REVOLUTION",
  "SUCCESSION",
  "ASSASSINATION",
  "IMPEACHMENT",
  "COLLAPSE",
  "FOREIGN_IMPOSED", // puppet regime after coup op or conquest
]);
export type GovernmentChangeKind = z.infer<typeof GovernmentChangeKindSchema>;

// ============================================================================
// History & Personality
// ============================================================================

export const KeyEventSchema = z.object({
  year: z.number(),
  event: z.string(),
  impact: z.string(),
});
export type KeyEvent = z.infer<typeof KeyEventSchema>;

export const HistoryProfileSchema = z.object({
  keyEvents: z.array(KeyEventSchema).default([]),
  historicalRivals: z.array(z.string()).default([]),
  historicalAllies: z.array(z.string()).default([]),
  sphereOfInfluence: z.array(z.string()).default([]),
  foreignPolicyOrientation: ForeignPolicyOrientationSchema.default("BALANCING"),
  narrative: z.string().optional(), // 2-3 sentence national character summary
});
export type HistoryProfile = z.infer<typeof HistoryProfileSchema>;

export const PersonalityTraitsSchema = z.object({
  warPropensity: z.number().min(0).max(100), // How likely to use military force
  allianceLoyalty: z.number().min(0).max(100), // How loyal to existing alliances
  diplomaticFlexibility: z.number().min(0).max(100), // Willingness to negotiate
  riskTolerance: z.number().min(0).max(100), // Willingness to take risks
  expansionism: z.number().min(0).max(100), // Desire for territorial/influence growth
  isolationism: z.number().min(0).max(100), // Preference for non-intervention
  ideologicalRigidity: z.number().min(0).max(100).default(50), // Ideology over pragmatism
  prestigeEmphasis: z.number().min(0).max(100).default(50), // Prestige vs stability emphasis
});
export type PersonalityTraits = z.infer<typeof PersonalityTraitsSchema>;

// Red lines - actions that trigger immediate strong response
export const RedLineSchema = z.object({
  type: z.enum(["TERRITORIAL", "ALLIANCE", "NUCLEAR", "ECONOMIC", "IDEOLOGICAL"]),
  targetCountryId: z.string().optional(),
  description: z.string(),
  severity: z.number().min(1).max(10),
});
export type RedLine = z.infer<typeof RedLineSchema>;

export const InternalDivisionSchema = z.object({
  kind: z.enum(["ETHNIC", "RELIGIOUS", "IDEOLOGICAL", "REGIONAL"]),
  name: z.string(),
  strength: z.number().min(0).max(100), // share of population / political weight
  tension: z.number().min(0).max(100), // how aggravated it currently is
});
export type InternalDivision = z.infer<typeof InternalDivisionSchema>;

// ============================================================================
// Goal Schema
// ============================================================================

export const GoalSchema = z.object({
  id: z.string(),
  type: z.enum(["TERRITORIAL", "ECONOMIC", "IDEOLOGICAL", "SECURITY", "PRESTIGE"]),
  targetCountryId: z.string().optional(),
  priority: z.number().min(0).max(100),
  description: z.string(),
});
export type Goal = z.infer<typeof GoalSchema>;

// ============================================================================
// Action Schema
// ============================================================================

export const ActionSchema = z.object({
  type: ActionTypeSchema,
  targetCountryId: z.string().optional(),
  value: z.number().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type Action = z.infer<typeof ActionSchema>;

// ============================================================================
// CountryIntent Schema (AI output)
// ============================================================================

export const CountryIntentSchema = z.object({
  countryId: z.string(),
  actions: z.array(ActionSchema),
  reasoning: z.string().optional(),
});
export type CountryIntent = z.infer<typeof CountryIntentSchema>;

// ============================================================================
// Event & Crisis Decision Schemas
// ============================================================================

export const DecisionOptionSchema = z.object({
  id: z.string(),
  label: z.string(), // "Condemn publicly"
  description: z.string(), // what this choice means
  // Actions injected next turn when chosen (resolved through normal pipeline)
  actions: z.array(ActionSchema).default([]),
  // Direct effects applied immediately on choice: e.g. { "relations:USA": -10, "stability": 5 }
  // Keys: approval, stability, legitimacy, gdp (%), growth (pct-points/yr), pc, mobilization,
  // insurgency (+/- levels), intel, coupShield (turns), relations:<ISO3>, relationsRivals, relationsAllies
  effects: z.record(z.string(), z.number()).default({}),
  tensionDelta: z.number().default(0),
  // Delayed consequence: another crisis template fires `delay` turns later
  followUp: z.object({ templateId: z.string(), delay: z.number().min(1) }).optional(),
  // Which advisor backs this option (UI shows faces/endorsements)
  backedBy: z.array(z.string()).default([]),
});
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

export const PendingDecisionSchema = z.object({
  id: z.string(),
  turn: z.number(),
  title: z.string(),
  situation: z.string(),
  affectedCountries: z.array(z.string()).default([]),
  options: z.array(DecisionOptionSchema),
  deadlineTurn: z.number(), // auto-resolves to the default option if ignored past this turn
  templateId: z.string().default("generic"),
  urgency: z.enum(["ROUTINE", "URGENT", "EXISTENTIAL"]).default("URGENT"),
  defaultOptionId: z.string().optional(), // what happens if the player does nothing
});
export type PendingDecision = z.infer<typeof PendingDecisionSchema>;

export const EventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "RANDOM",
    "TRIGGERED",
    "WAR",
    "DIPLOMACY",
    "ECONOMY",
    "STABILITY",
    "GOVERNMENT",
    "NUCLEAR",
    "COVERT",
    "SUMMIT",
    "CRISIS",
  ]),
  title: z.string(),
  description: z.string(),
  affectedCountries: z.array(z.string()),
  effects: z.record(z.string(), z.number()).optional(),
  turn: z.number(),
  severity: z.enum(["MINOR", "NOTABLE", "MAJOR", "CRITICAL"]).default("NOTABLE"),
  decision: PendingDecisionSchema.optional(), // crisis requiring player response
});
export type GameEvent = z.infer<typeof EventSchema>;

// ============================================================================
// ActiveWar Schema
// ============================================================================

export const ActiveWarSchema = z.object({
  id: z.string(),
  attackerId: z.string(),
  defenderId: z.string(),
  startTurn: z.number(),
  // single front line: 50 = stalemate, 100 = attacker overruns defender, 0 = reverse
  frontline: z.number().min(0).max(100).default(50),
  attackerCasualties: z.number().default(0),
  defenderCasualties: z.number().default(0),
  exhaustion: z.number().min(0).max(100).default(0), // pressure toward ceasefire
  // Joined to help this country (pact or appeal): the war ends when that country's own war does
  alliedWith: z.string().optional(),
});
export type ActiveWar = z.infer<typeof ActiveWarSchema>;

// ============================================================================
// Military, Suppliers, Nuclear
// ============================================================================

export const UnitTypeSchema = z.enum(["TANKS", "HELICOPTERS", "SAMS", "FIGHTERS", "INFANTRY"]);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export const MilitaryUnitsSchema = z.object({
  tanks: z.number().min(0).default(0),
  helicopters: z.number().min(0).default(0),
  sams: z.number().min(0).default(0),
  fighters: z.number().min(0).default(0),
  infantry: z.number().min(0).default(0),
});
export type MilitaryUnits = z.infer<typeof MilitaryUnitsSchema>;

export const BorderDeploymentSchema = z.object({
  targetCountryId: z.string(),
  troops: z.number().min(0),
});
export type BorderDeployment = z.infer<typeof BorderDeploymentSchema>;

export const SupplierIdSchema = z.enum(["USA", "GBR", "FRA", "RUS", "PRIVATE"]);
export type SupplierId = z.infer<typeof SupplierIdSchema>;

export const NuclearProgramSchema = z.object({
  status: NuclearStatusSchema.default("NONE"),
  progress: z.number().min(0).max(100).default(0), // toward TESTED while DEVELOPING
  funded: z.boolean().default(false),
  consecutiveStrikesTaken: z.number().min(0).default(0), // two-strike rule counter
  warheads: z.number().min(0).default(0),
});
export type NuclearProgram = z.infer<typeof NuclearProgramSchema>;

export const MilitaryDoctrineSchema = z.enum([
  "OFFENSIVE",
  "DEFENSIVE",
  "EXPEDITIONARY",
  "GUERILLA",
  "DETERRENCE",
]);
export type MilitaryDoctrine = z.infer<typeof MilitaryDoctrineSchema>;

// ============================================================================
// Belief State (asymmetric information)
// ============================================================================

export const BeliefSchema = z.object({
  militaryStrength: z.number(), // perceived composite strength
  gdp: z.number(),
  stability: z.number(),
  nuclearProgress: z.number(), // perceived nuclear program progress 0-100
  accuracy: z.number().min(0).max(100), // confidence; drives uncertainty ranges
  lastUpdatedTurn: z.number(),
});
export type Belief = z.infer<typeof BeliefSchema>;

// ============================================================================
// Country Profile (static JSON in data/countries) vs Country State (runtime)
// ============================================================================

export const EconomyProfileSchema = z.object({
  gdp: z.number().min(0),
  growthRate: z.number(),
  debtGdpRatio: z.number().min(0).default(60),
  sectors: z
    .object({
      agriculture: z.number(),
      industry: z.number(),
      services: z.number(),
    })
    .optional(),
  keyResources: z.array(z.string()).default([]),
  keyExports: z.array(z.string()).default([]),
  developmentLevel: z.enum(["DEVELOPED", "EMERGING", "DEVELOPING"]).default("EMERGING"),
});
export type EconomyProfile = z.infer<typeof EconomyProfileSchema>;

export const MilitaryProfileSchema = z.object({
  manpower: z.number().min(0),
  airpower: z.number().min(0),
  doctrine: MilitaryDoctrineSchema.default("DEFENSIVE"),
  nuclearStatus: NuclearStatusSchema.default("NONE"),
  warheads: z.number().min(0).default(0),
  arms_suppliers: z.array(SupplierIdSchema).default([]),
});
export type MilitaryProfile = z.infer<typeof MilitaryProfileSchema>;

export const CountryProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  iso3: z.string().length(3).optional(),
  population: z.number().min(0),

  regimeType: RegimeTypeSchema,
  politicalSystem: PoliticalSystemSchema,
  history: HistoryProfileSchema,
  personality: PersonalityTraitsSchema,
  redLines: z.array(RedLineSchema).default([]),
  internalDivisions: z.array(InternalDivisionSchema).default([]),

  economy: EconomyProfileSchema,
  military: MilitaryProfileSchema,
  militaryBudgetPct: z.number().min(0).max(40),

  stability: z.number().min(0).max(100),
  legitimacy: z.number().min(0).max(100),
  intelLevel: z.number().min(0).max(100),
  insurgencyLevel: InsurgencyLevelSchema.default("NONE"),

  goals: z.array(GoalSchema),

  geo: z
    .object({
      bounds: z.array(z.number()).length(4).optional(),
      capital: z
        .object({
          name: z.string(),
          coordinates: z.array(z.number()).length(2),
        })
        .optional(),
    })
    .optional(),
});
export type CountryProfile = z.infer<typeof CountryProfileSchema>;

export const CountryStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  iso3: z.string().length(3),
  population: z.number().min(0).default(0),

  // Government
  regimeType: RegimeTypeSchema,
  politicalSystem: PoliticalSystemSchema,
  leader: LeaderSchema,
  approval: z.number().min(0).max(100).default(50), // public approval of leadership

  // Economy
  gdp: z.number().min(0),
  growthRate: z.number(),
  trendGrowth: z.number().optional(), // structural growth that shocks decay back toward
  realGrowth: z.number().optional(), // last month's effective annual growth after war/instability/embargo drags
  debtGdpRatio: z.number().min(0),
  militaryBudgetPercent: z.number().min(0).max(40), // wartime states exceed 20% (Ukraine ~26–30%)
  baseMilitaryBudget: z.number().optional(), // peacetime share at the start: threats raise spending relative to it
  economyProfile: EconomyProfileSchema.optional(),
  embargoedBy: z.array(z.string()).default([]), // supplier/country ids enforcing embargo
  underGlobalEmbargo: z.boolean().default(false),

  // Military
  manpower: z.number().min(0),
  airpower: z.number().min(0),
  mobilizationLevel: z.number().min(0).max(100),
  doctrine: MilitaryDoctrineSchema.default("DEFENSIVE"),
  borderDeployments: z.array(BorderDeploymentSchema).default([]),
  supplierRelations: z.record(z.string(), z.number()).default({}), // purchase history per supplier
  nuclear: NuclearProgramSchema.default({
    status: "NONE",
    progress: 0,
    funded: false,
    consecutiveStrikesTaken: 0,
    warheads: 0,
  }),

  // Diplomacy
  relations: z.record(z.string(), z.number().min(-100).max(100)),
  alliances: z.array(z.string()),
  atWarWith: z.array(z.string()),
  diplomaticStances: z.record(z.string(), z.enum(["IMPROVE", "MAINTAIN", "WORSEN"])).default({}),

  // Internal
  stability: z.number().min(0).max(100),
  legitimacy: z.number().min(0).max(100),
  insurgencyLevel: InsurgencyLevelSchema.default("NONE"),
  policingTactic: PolicingTacticSchema.default("SOFT"),
  internalDivisions: z.array(InternalDivisionSchema).default([]),

  // Intelligence & Beliefs
  intelLevel: z.number().min(0).max(100),
  counterIntelLevel: z.number().min(0).max(100).default(30),
  beliefs: z.record(z.string(), BeliefSchema).default({}),

  // Goals, Personality & History
  goals: z.array(GoalSchema),
  personality: PersonalityTraitsSchema,
  redLines: z.array(RedLineSchema).default([]),
  history: HistoryProfileSchema.default({
    keyEvents: [],
    historicalRivals: [],
    historicalAllies: [],
    sphereOfInfluence: [],
    foreignPolicyOrientation: "BALANCING",
  }),

  // Geography: capital [lon, lat] (neighbor checks, refugee flows, map anchors)
  capital: z.tuple([z.number(), z.number()]).optional(),

  // Bookkeeping
  collapsed: z.boolean().default(false),
});
export type CountryState = z.infer<typeof CountryStateSchema>;

// ============================================================================
// Newspaper / Timeline
// ============================================================================

export const NewspaperEntrySchema = z.object({
  headline: z.string(),
  description: z.string(),
  relatedCountries: z.array(z.string()),
  impact: z.string().optional(),
  turn: z.number(),
  category: z
    .enum(["WAR", "DIPLOMACY", "GOVERNMENT", "ECONOMY", "NUCLEAR", "COVERT", "DOMESTIC", "WORLD"])
    .default("WORLD"),
});
export type NewspaperEntry = z.infer<typeof NewspaperEntrySchema>;

export const TimelineEntrySchema = z.object({
  turn: z.number(),
  date: z.string(),
  category: z.enum(["WAR", "DIPLOMACY", "GOVERNMENT", "ECONOMY", "NUCLEAR", "COVERT", "SCORE"]),
  description: z.string(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// ============================================================================
// Scoring & Game Over
// ============================================================================

export const ScoreSchema = z.object({
  economic: z.number().min(0).max(50).default(25),
  security: z.number().min(0).max(50).default(25),
  approval: z.number().min(0).max(50).default(25),
  prestige: z.number().min(0).max(50).default(25),
  total: z.number().min(0).max(200).default(100),
});
export type Score = z.infer<typeof ScoreSchema>;

export const HistorySampleSchema = z.object({
  turn: z.number(),
  gdp: z.number(),
  stability: z.number(),
  approval: z.number(),
  globalTension: z.number(),
  score: z.number(),
});
export type HistorySample = z.infer<typeof HistorySampleSchema>;

export const GameOverReasonSchema = z.enum([
  "DEPOSED_COUP",
  "LOST_ELECTION",
  "ASSASSINATED",
  "IMPEACHED",
  "REVOLUTION",
  "NUCLEAR_HOLOCAUST",
  "COUNTRY_COLLAPSED",
  "TERM_COMPLETED",
  "OBJECTIVE_FAILED",
]);
export type GameOverReason = z.infer<typeof GameOverReasonSchema>;

export const GameOverSchema = z.object({
  reason: GameOverReasonSchema,
  description: z.string(),
  turn: z.number(),
});
export type GameOver = z.infer<typeof GameOverSchema>;

// ============================================================================
// Game modes, objectives, drama director, player turn report
// ============================================================================

export const GameModeSchema = z.enum(["FLASHPOINT", "TERM", "LEGACY"]);
export type GameMode = z.infer<typeof GameModeSchema>;

export const DifficultySchema = z.enum(["ANALYST", "STATESMAN", "STRONGMAN"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const MODE_TURNS: Record<GameMode, number> = { FLASHPOINT: 12, TERM: 48, LEGACY: 120 };

// A condition the player must satisfy (evaluated at the end, tracked every turn)
export const ObjectiveConditionSchema = z.object({
  kind: z.enum([
    "SURVIVE", // stay in power to the end
    "NO_NUCLEAR", // target never reaches maxStatus (TESTED by default)
    "NO_WAR_WITH", // never at war with target
    "WAR_RESULT", // war with target ended or frontline favorable (>= minFrontline from player side)
    "STAT_MIN", // player stat >= min at the end (approval|stability|legitimacy)
    "RELATION_MIN", // player relation with target >= min at the end
    "SCORE_PAR", // final score >= par
    "NOT_COLLAPSED", // target state still standing
    "WAR_ENDED", // no war between targetId and otherId (third-party mediation goals)
    "INSURGENCY_MAX", // player's insurgency at or below `level`
  ]),
  targetId: z.string().optional(),
  otherId: z.string().optional(),
  level: z.enum(["NONE", "UNREST", "REBELLION", "GUERILLA"]).optional(),
  stat: z.enum(["approval", "stability", "legitimacy"]).optional(),
  min: z.number().optional(),
  maxStatus: z.enum(["LATENT", "DEVELOPING", "TESTED", "ARMED"]).optional(),
  label: z.string(),
});
export type ObjectiveCondition = z.infer<typeof ObjectiveConditionSchema>;

export const ObjectiveSchema = z.object({
  title: z.string(),
  briefing: z.string(),
  primary: z.array(ObjectiveConditionSchema), // all required for victory (1 star)
  bonus: z.array(ObjectiveConditionSchema).default([]), // each adds a star (max 3)
  par: z.number().default(100), // expected score for skilled play
  debrief: z.string().default(""), // "what really happened / what experts fear"
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const ScheduledCrisisSchema = z.object({
  templateId: z.string(),
  turn: z.number(),
  targetId: z.string().optional(),
  // Authored crises (flashpoints) carry the full decision inline
  decision: z.lazy(() => PendingDecisionSchema).optional(),
  headline: z.string().optional(),
  text: z.string().optional(),
});
export type ScheduledCrisis = z.infer<typeof ScheduledCrisisSchema>;

export const DirectorStateSchema = z.object({
  dramaDebt: z.number().default(0), // turns since the player last faced a decision
  lastUsed: z.record(z.string(), z.number()).default({}), // template id → turn last used
  scheduled: z.array(ScheduledCrisisSchema).default([]),
  coupWarnedTurn: z.number().nullable().default(null),
  revoltWarnedTurn: z.number().nullable().default(null),
  coupShieldUntil: z.number().default(-1),
  counterIntelUntil: z.number().default(-1), // spy-hunt shield: foreign ops on the player often foiled
  propagandaTurns: z.array(z.number()).default([]), // turns the player used propaganda
  denounceTurns: z.array(z.number()).default([]), // turns the player denounced someone
  lowPoint: z.number().default(100), // lowest min(approval, stability) seen — for comebacks
  rallies: z.number().default(0), // comebacks achieved
  closeCalls: z.number().default(0),
  inDanger: z.boolean().default(false),
  // What the player actually did: action type → times carried out ("TYPE:tried" counts attempts)
  record: z.record(z.string(), z.number()).default({}),
});
export type DirectorState = z.infer<typeof DirectorStateSchema>;

export const StatDeltaSchema = z.object({ before: z.number(), after: z.number() });

export const PlayerTurnReportSchema = z.object({
  turn: z.number(),
  orders: z.array(z.object({ label: z.string(), ok: z.boolean(), detail: z.string() })).default([]),
  decisions: z.array(z.object({ title: z.string(), choice: z.string() })).default([]),
  deltas: z.record(z.string(), StatDeltaSchema).default({}),
  causes: z.array(z.string()).default([]), // plain-language explanations of what moved
  moments: z.array(z.string()).default([]), // milestone stamps: "RALLY", "CLOSE CALL", "FIRST ALLIANCE"…
});
export type PlayerTurnReport = z.infer<typeof PlayerTurnReportSchema>;

// ============================================================================
// WorldState Schema
// ============================================================================

export const WorldStateSchema = z.object({
  turn: z.number().min(0),
  date: z.string(), // YYYY-MM format
  countries: z.array(CountryStateSchema),
  wars: z.array(ActiveWarSchema),
  globalTension: z.number().min(0).max(100),
  eventQueue: z.array(EventSchema),
  seed: z.number(),
  playerCountryId: z.string(),
  newspaper: z.array(NewspaperEntrySchema).default([]),
  pendingDecisions: z.array(PendingDecisionSchema).default([]),
  timeline: z.array(TimelineEntrySchema).default([]),
  score: ScoreSchema.default({
    economic: 25,
    security: 25,
    approval: 25,
    prestige: 25,
    total: 100,
  }),
  scoreHistory: z.array(HistorySampleSchema).default([]),
  gameOver: GameOverSchema.nullable().default(null),
  playerBackstory: z.string().default(""),

  // Session structure (defaults keep pre-overhaul saves loadable)
  scenarioId: z.string().default(""),
  mode: GameModeSchema.default("LEGACY"),
  difficulty: DifficultySchema.default("STATESMAN"),
  maxTurns: z.number().default(120),
  flashpointId: z.string().nullable().default(null),
  objective: ObjectiveSchema.nullable().default(null),
  politicalCapital: z.number().default(3),
  director: DirectorStateSchema.default({
    dramaDebt: 0,
    lastUsed: {},
    scheduled: [],
    coupWarnedTurn: null,
    revoltWarnedTurn: null,
    coupShieldUntil: -1,
    counterIntelUntil: -1,
    propagandaTurns: [],
    denounceTurns: [],
    lowPoint: 100,
    rallies: 0,
    closeCalls: 0,
    inDanger: false,
    record: {},
  }),
  turnReport: PlayerTurnReportSchema.nullable().default(null),
  outcome: z
    .object({
      victory: z.boolean(),
      stars: z.number(),
      conditions: z.array(z.object({ label: z.string(), met: z.boolean(), bonus: z.boolean() })),
    })
    .nullable()
    .default(null),
});
export type WorldState = z.infer<typeof WorldStateSchema>;

// ============================================================================
// Turn Schema
// ============================================================================

export const TurnSchema = z.object({
  number: z.number().min(0),
  date: z.string(),
  events: z.array(EventSchema),
  intents: z.array(CountryIntentSchema),
  playerActions: z.array(ActionSchema),
  newspaper: z.array(NewspaperEntrySchema),
});
export type Turn = z.infer<typeof TurnSchema>;

// ============================================================================
// Player view (belief-filtered world, returned by API; not persisted)
// ============================================================================

export interface UncertainRange {
  estimate: number;
  low: number;
  high: number;
  confidence: number; // 0-100
}

export interface PlayerViewCountry {
  id: string;
  name: string;
  iso3: string;
  isPlayer: boolean;
  // Public knowledge (always accurate)
  regimeType: RegimeType;
  leader: Leader;
  politicalSystem: PoliticalSystem;
  alliances: string[];
  atWarWith: string[];
  relationWithPlayer: number;
  diplomaticLevel: DiplomaticLevel;
  insurgencyLevel: InsurgencyLevel;
  history: HistoryProfile;
  // Intel-filtered knowledge (uncertain for foreign countries)
  gdp: UncertainRange;
  militaryStrength: UncertainRange;
  manpower: UncertainRange;
  stability: UncertainRange;
  nuclearStatus: NuclearStatus; // TESTED/ARMED is public; DEVELOPING may be hidden
  nuclearProgress: UncertainRange | null; // null = no intel on program
  intelConfidence: number; // 0-100 overall
  // Player-only full detail
  full?: CountryState;
}

// ============================================================================
// Diplomatic level helpers
// ============================================================================

export function relationToLevel(
  relation: number,
  atWar: boolean,
  allied: boolean,
): DiplomaticLevel {
  if (atWar) return "WAR";
  if (allied) return "MILITARY_PACT";
  if (relation >= 70) return "PROFITABLE";
  if (relation >= 40) return "BENEFICIAL";
  if (relation >= 10) return "FAVOURABLE";
  if (relation >= -25) return "SATISFACTORY";
  return "LAMENTABLE";
}

export function stabilityToLevel(stability: number): StabilityLevel {
  if (stability >= 80) return "VERY_SOLID";
  if (stability >= 60) return "SOLID";
  if (stability >= 40) return "MODERATE";
  if (stability >= 20) return "UNSTABLE";
  return "COLLAPSING";
}

// ============================================================================
// Save File Schema
// ============================================================================

export const SaveFileSchema = z.object({
  version: z.string(),
  worldState: WorldStateSchema,
  playerCountry: z.string(),
  seed: z.number(),
  turnLog: z.array(TurnSchema),
});
export type SaveFile = z.infer<typeof SaveFileSchema>;

// ============================================================================
// Simulated countries (41): every one is playable and fully agent-driven
// ============================================================================

export const TIER1_COUNTRIES = [
  // Great powers & original roster
  "USA",
  "CHN",
  "RUS",
  "DEU",
  "IND",
  "BRA",
  "CAN",
  "MEX",
  "FRA",
  "GBR",
  "POL",
  "TUR",
  "SAU",
  "IRN",
  "ISR",
  "EGY",
  "JPN",
  "IDN",
  "KOR",
  "PRK",
  "AUS",
  "PAK",
  "NGA",
  "ZAF",
  "ITA",
  // 2026 hotspots (Natural Earth ADM0_A3 codes: Palestine is PSX)
  "UKR",
  "TWN",
  "BLR",
  "DNK",
  "SYR",
  "IRQ",
  "PSX",
  "LBN",
  "YEM",
  "ARE",
  "AFG",
  "PHL",
  "VEN",
  "CUB",
  "SDN",
  "ETH",
] as const;

export type Tier1CountryCode = (typeof TIER1_COUNTRIES)[number];
