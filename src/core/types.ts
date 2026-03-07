import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const RegimeTypeSchema = z.enum([
  'DEMOCRACY',
  'AUTOCRACY',
  'THEOCRACY',
  'MILITARY_JUNTA',
  'COMMUNIST',
  'MONARCHY',
]);
export type RegimeType = z.infer<typeof RegimeTypeSchema>;

export const ActionTypeSchema = z.enum([
  'DIPLOMACY_IMPROVE_RELATIONS',
  'DIPLOMACY_DENOUNCE',
  'DIPLOMACY_PROPOSE_ALLIANCE',
  'DIPLOMACY_BREAK_ALLIANCE',
  'DIPLOMACY_DECLARE_WAR',
  'DIPLOMACY_PROPOSE_CEASEFIRE',
  'MILITARY_MOBILIZE',
  'MILITARY_DEMOBILIZE',
  'MILITARY_PROCURE',
  'ECONOMY_ADJUST_MILITARY_BUDGET',
  'INTEL_GATHER',
  'INTEL_SABOTAGE',
  'DOMESTIC_PROPAGANDA',
  'DOMESTIC_REFORM',
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

// ============================================================================
// Goal Schema
// ============================================================================

export const GoalSchema = z.object({
  id: z.string(),
  type: z.enum(['TERRITORIAL', 'ECONOMIC', 'IDEOLOGICAL', 'SECURITY', 'PRESTIGE']),
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
  type: z.enum(['RANDOM', 'TRIGGERED', 'WAR', 'DIPLOMACY', 'ECONOMY', 'STABILITY']),
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

export const CountryStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  iso3: z.string().length(3),

  // Economy
  gdp: z.number().min(0),
  growthRate: z.number(),
  debtGdpRatio: z.number().min(0),
  militaryBudgetPercent: z.number().min(0).max(20),

  // Military
  manpower: z.number().min(0),
  airpower: z.number().min(0),
  mobilizationLevel: z.number().min(0).max(100),

  // Diplomacy
  relations: z.record(z.string(), z.number().min(-100).max(100)),
  alliances: z.array(z.string()),
  atWarWith: z.array(z.string()),

  // Internal
  stability: z.number().min(0).max(100),
  regimeType: RegimeTypeSchema,
  legitimacy: z.number().min(0).max(100),

  // Intelligence & Beliefs
  intelLevel: z.number().min(0).max(100),
  beliefState: z.record(z.string(), z.unknown()).optional(),

  // Goals & Personality
  goals: z.array(GoalSchema),
  riskTolerance: z.number().min(0).max(100),
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
  'USA', 'CHN', 'RUS', 'DEU', 'IND', // Global Superpowers
  'BRA', 'CAN', 'MEX', // Americas
  'FRA', 'GBR', 'POL', 'TUR', // Europe
  'SAU', 'IRN', 'ISR', 'EGY', // Middle East
  'JPN', 'IDN', 'KOR', 'PRK', // Asia-Pacific
  'AUS', 'PAK', 'NGA', 'ZAF', 'ITA', // Additional Tier 1
] as const;

export type Tier1CountryCode = (typeof TIER1_COUNTRIES)[number];
