import { CountryState, DiplomaticLevel } from '../types.js';

// Thresholds for diplomatic levels (from spec)
export const DIPLOMATIC_THRESHOLDS: Record<DiplomaticLevel, { min: number; max: number }> = {
  MILITARY_PACT: { min: 80, max: 100 },
  PROFITABLE: { min: 60, max: 79 },
  BENEFICIAL: { min: 40, max: 59 },
  FAVOURABLE: { min: 20, max: 39 },
  SATISFACTORY: { min: 0, max: 19 },
  LAMENTABLE: { min: -50, max: -1 },
  WAR: { min: -100, max: -51 },
};

export function getRelationLevel(relationValue: number): DiplomaticLevel {
  if (relationValue >= 80) return 'MILITARY_PACT';
  if (relationValue >= 60) return 'PROFITABLE';
  if (relationValue >= 40) return 'BENEFICIAL';
  if (relationValue >= 20) return 'FAVOURABLE';
  if (relationValue >= 0) return 'SATISFACTORY';
  if (relationValue >= -50) return 'LAMENTABLE';
  return 'WAR';
}

export function getRelationLevelLabel(level: DiplomaticLevel): string {
  const labels: Record<DiplomaticLevel, string> = {
    MILITARY_PACT: 'Military Pact',
    PROFITABLE: 'Profitable',
    BENEFICIAL: 'Beneficial',
    FAVOURABLE: 'Favourable',
    SATISFACTORY: 'Satisfactory',
    LAMENTABLE: 'Lamentable',
    WAR: 'At War',
  };
  return labels[level];
}

// Diplomatic action costs (from spec)
export const DIPLOMATIC_ACTION_COSTS = {
  IMPROVE: 100,      // $100M/month from defense budget
  MAINTAIN: 0,       // Free
  WORSEN: 0,         // Free (denounce)
  PROPOSE_ALLIANCE: 50,
  BREAK_ALLIANCE: 0,
};

export interface DiplomaticActionResult {
  relationChange: number;
  cost: number;
  description: string;
  sideEffects?: Array<{ countryId: string; relationChange: number }>;
}

export function calculateImproveRelations(
  actor: CountryState,
  target: CountryState
): DiplomaticActionResult {
  const currentRelation = actor.relations[target.id] ?? 0;
  const level = getRelationLevel(currentRelation);
  
  // Base improvement
  let change = 5;
  
  // Harder to improve if already good
  if (level === 'PROFITABLE') change = 3;
  if (level === 'MILITARY_PACT') change = 1;
  
  // Easier if same regime type
  if (actor.regimeType === target.regimeType) change += 2;
  
  // Harder if historical rivals
  if (actor.historicalRivals?.includes(target.id)) change -= 2;
  
  return {
    relationChange: change,
    cost: DIPLOMATIC_ACTION_COSTS.IMPROVE,
    description: `Diplomatic mission to ${target.name}: Relations improved by ${change}`,
  };
}

export function calculateDenounce(
  actor: CountryState,
  target: CountryState
): DiplomaticActionResult {
  const sideEffects: Array<{ countryId: string; relationChange: number }> = [];
  
  // Denouncing improves relations with target's enemies
  for (const [countryId, relation] of Object.entries(target.relations)) {
    if (relation < -30 && countryId !== actor.id) {
      sideEffects.push({ countryId, relationChange: 3 });
    }
  }
  
  // Denouncing worsens relations with target's allies
  for (const allyId of target.alliances) {
    if (allyId !== actor.id) {
      sideEffects.push({ countryId: allyId, relationChange: -5 });
    }
  }
  
  return {
    relationChange: -10,
    cost: 0,
    description: `${actor.name} publicly denounces ${target.name}`,
    sideEffects,
  };
}

export function canProposeAlliance(
  actor: CountryState,
  target: CountryState
): { canPropose: boolean; reason?: string } {
  const relation = actor.relations[target.id] ?? 0;
  const level = getRelationLevel(relation);
  
  // Already allied
  if (actor.alliances.includes(target.id)) {
    return { canPropose: false, reason: 'Already allied' };
  }
  
  // At war
  if (actor.atWarWith.includes(target.id)) {
    return { canPropose: false, reason: 'Cannot ally with enemy' };
  }
  
  // Need at least PROFITABLE relations
  if (level !== 'MILITARY_PACT' && level !== 'PROFITABLE') {
    return { canPropose: false, reason: `Relations must be at least Profitable (current: ${getRelationLevelLabel(level)})` };
  }
  
  return { canPropose: true };
}

export function calculateAllianceAcceptance(
  proposer: CountryState,
  target: CountryState
): { accepts: boolean; chance: number; reason: string } {
  const relation = target.relations[proposer.id] ?? 0;
  let chance = 50 + relation / 2; // Base 50% + relation bonus
  
  // Personality modifiers
  if (target.personality) {
    chance += target.personality.allianceLoyalty / 5;
    chance -= target.personality.isolationism / 5;
  }
  
  // Same regime type bonus
  if (proposer.regimeType === target.regimeType) chance += 10;
  
  // Historical allies bonus
  if (target.historicalAllies?.includes(proposer.id)) chance += 20;
  
  // Historical rivals penalty
  if (target.historicalRivals?.includes(proposer.id)) chance -= 30;
  
  // Clamp
  chance = Math.max(5, Math.min(95, chance));
  const accepts = Math.random() * 100 < chance;
  
  return {
    accepts,
    chance,
    reason: accepts 
      ? `${target.name} accepts alliance with ${proposer.name}`
      : `${target.name} declines alliance proposal`,
  };
}

export interface AllianceBenefits {
  mutualDefense: boolean;
  intelSharing: number;      // % intel boost
  procurementDiscount: number; // % discount on arms
}

export const ALLIANCE_BENEFITS: AllianceBenefits = {
  mutualDefense: true,
  intelSharing: 15,
  procurementDiscount: 10,
};

export function calculateBetrayalPenalty(
  betrayer: CountryState,
  betrayed: CountryState
): { relationPenalty: number; globalReputationHit: number } {
  // Breaking alliance causes severe penalty
  return {
    relationPenalty: -50,
    globalReputationHit: -10, // All countries lose trust
  };
}
