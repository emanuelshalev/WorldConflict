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

// 7-level diplomatic hierarchy (from spec)
export const DiplomaticLevelSchema = z.enum([
  "MILITARY_PACT",  // Best - mutual defense
  "PROFITABLE",     // Strong trade, can request alliance
  "BENEFICIAL",     // Good relations
  "FAVOURABLE",     // Positive
  "SATISFACTORY",   // Neutral
  "LAMENTABLE",     // Poor
  "WAR",            // Worst - active conflict
]);
export type DiplomaticLevel = z.infer<typeof DiplomaticLevelSchema>;

// Insurgency levels (from spec)
export const InsurgencyLevelSchema = z.enum([
  "NONE",
  "UNREST",
  "REBELLION",
  "GUERILLA",
]);
export type InsurgencyLevel = z.infer<typeof InsurgencyLevelSchema>;

// Stability levels (named, from spec)
export const StabilityLevelSchema = z.enum([
  "VERY_SOLID",     // 80-100
  "SOLID",          // 60-79
  "MODERATE",       // 40-59
  "UNSTABLE",       // 20-39
  "COLLAPSING",     // 0-19
]);
export type StabilityLevel = z.infer<typeof StabilityLevelSchema>;

// Nuclear status (from spec)
export const NuclearStatusSchema = z.enum([
  "NONE",
  "LATENT",      // Could develop
  "DEVELOPING",  // Active program
  "ARMED",       // Has weapons
]);
export type NuclearStatus = z.infer<typeof NuclearStatusSchema>;

// Policing tactics (from spec)
export const PolicingTacticSchema = z.enum([
  "SOFT",   // Slow but no backlash
  "HARD",   // Fast but international outcry
]);
export type PolicingTactic = z.infer<typeof PolicingTacticSchema>;

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
  "MILITARY_AIRSTRIKE",        // Pre-war precision strike
  "MILITARY_DEPLOY_BORDER",    // Deploy troops to border
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
  // Domestic
  "DOMESTIC_PROPAGANDA",
  "DOMESTIC_REFORM",
  "DOMESTIC_POLICING",         // Soft or hard policing
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

// ============================================================================
// Personality Traits Schema (for AI behavior)
// ============================================================================

export const PersonalityTraitsSchema = z.object({
  warPropensity: z.number().min(0).max(100),        // How likely to use military force
  allianceLoyalty: z.number().min(0).max(100),      // How loyal to existing alliances
  diplomaticFlexibility: z.number().min(0).max(100), // Willingness to negotiate
  riskTolerance: z.number().min(0).max(100),        // Willingness to take risks
  expansionism: z.number().min(0).max(100),         // Desire for territorial growth
  isolationism: z.number().min(0).max(100),         // Preference for non-intervention
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
// Event Schema
// ============================================================================

export const EventSchema = z.object({
  id: z.string(),
  type: z.enum(["RANDOM", "TRIGGERED", "WAR", "DIPLOMACY", "ECONOMY", "STABILITY"]),
  title: z.string(),
  description: z.string(),
  affectedCountries: z.array(z.string()),
  effects: z.record(z.string(), z.number()).optional(),
  turn: z.number(),
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
  attackerProgress: z.number().min(0).max(100),
  defenderProgress: z.number().min(0).max(100),
  attackerCasualties: z.number(),
  defenderCasualties: z.number(),
});
export type ActiveWar = z.infer<typeof ActiveWarSchema>;

// ============================================================================
// CountryState Schema
// ============================================================================

// Unit types for military (from spec)
export const UnitTypeSchema = z.enum([
  "TANKS",
  "HELICOPTERS",
  "SAMs",
  "FIGHTERS",
  "INFANTRY",
]);
export type UnitType = z.infer<typeof UnitTypeSchema>;

// Military units inventory
export const MilitaryUnitsSchema = z.object({
  tanks: z.number().min(0).default(0),
  helicopters: z.number().min(0).default(0),
  sams: z.number().min(0).default(0),
  fighters: z.number().min(0).default(0),
  infantry: z.number().min(0).default(0),
});
export type MilitaryUnits = z.infer<typeof MilitaryUnitsSchema>;

// Border deployment
export const BorderDeploymentSchema = z.object({
  targetCountryId: z.string(),
  troops: z.number().min(0),
  units: MilitaryUnitsSchema.optional(),
});
export type BorderDeployment = z.infer<typeof BorderDeploymentSchema>;

export const CountryStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  iso3: z.string().length(3),

  // Economy
  gdp: z.number().min(0),
  growthRate: z.number(),
  debtGdpRatio: z.number().min(0),
  militaryBudgetPercent: z.number().min(0).max(20),
  defenseBudget: z.number().min(0).optional(), // Absolute budget in millions

  // Military
  manpower: z.number().min(0),
  airpower: z.number().min(0),
  mobilizationLevel: z.number().min(0).max(100),
  units: MilitaryUnitsSchema.optional(),
  borderDeployments: z.array(BorderDeploymentSchema).optional(),
  nuclearStatus: NuclearStatusSchema.optional(),
  nuclearStrikesReceived: z.number().min(0).optional(), // For Two-Strike Rule

  // Diplomacy
  relations: z.record(z.string(), z.number().min(-100).max(100)),
  alliances: z.array(z.string()),
  atWarWith: z.array(z.string()),

  // Internal
  stability: z.number().min(0).max(100),
  regimeType: RegimeTypeSchema,
  legitimacy: z.number().min(0).max(100),
  insurgencyLevel: InsurgencyLevelSchema.optional(),
  policingTactic: PolicingTacticSchema.optional(),

  // Intelligence & Beliefs
  intelLevel: z.number().min(0).max(100),
  counterIntelLevel: z.number().min(0).max(100).optional(),
  beliefState: z.record(z.string(), z.unknown()).optional(),

  // Goals & Personality
  goals: z.array(GoalSchema),
  riskTolerance: z.number().min(0).max(100),
  personality: PersonalityTraitsSchema.optional(),
  redLines: z.array(RedLineSchema).optional(),

  // Historical context (for AI behavior)
  historicalRivals: z.array(z.string()).optional(),
  historicalAllies: z.array(z.string()).optional(),
});
export type CountryState = z.infer<typeof CountryStateSchema>;

// ============================================================================
// Newspaper Entry Schema
// ============================================================================

export const NewspaperEntrySchema = z.object({
  headline: z.string(),
  description: z.string(),
  relatedCountries: z.array(z.string()),
  impact: z.string().optional(),
  turn: z.number(),
});
export type NewspaperEntry = z.infer<typeof NewspaperEntrySchema>;

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
  newspaper: z.array(NewspaperEntrySchema).optional(),
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
