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
  effects: z.record(z.string(), z.number()).default({}),
  tensionDelta: z.number().default(0),
});
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

export const PendingDecisionSchema = z.object({
  id: z.string(),
  turn: z.number(),
  title: z.string(),
  situation: z.string(),
  affectedCountries: z.array(z.string()).default([]),
  options: z.array(DecisionOptionSchema),
  deadlineTurn: z.number(), // auto-resolves to first option if ignored past this turn
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
  militaryBudgetPct: z.number().min(0).max(20),

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
  debtGdpRatio: z.number().min(0),
  militaryBudgetPercent: z.number().min(0).max(20),
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
]);
export type GameOverReason = z.infer<typeof GameOverReasonSchema>;

export const GameOverSchema = z.object({
  reason: GameOverReasonSchema,
  description: z.string(),
  turn: z.number(),
});
export type GameOver = z.infer<typeof GameOverSchema>;

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
// Tier 1 Countries (25 total)
// ============================================================================

export const TIER1_COUNTRIES = [
  "USA",
  "CHN",
  "RUS",
  "DEU",
  "IND", // Global Superpowers
  "BRA",
  "CAN",
  "MEX", // Americas
  "FRA",
  "GBR",
  "POL",
  "TUR", // Europe
  "SAU",
  "IRN",
  "ISR",
  "EGY", // Middle East
  "JPN",
  "IDN",
  "KOR",
  "PRK", // Asia-Pacific
  "AUS",
  "PAK",
  "NGA",
  "ZAF",
  "ITA", // Additional Tier 1
] as const;

export type Tier1CountryCode = (typeof TIER1_COUNTRIES)[number];
