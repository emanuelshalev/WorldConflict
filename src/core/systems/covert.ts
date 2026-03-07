import { CountryState, InsurgencyLevel } from '../types.js';

export interface CovertOperation {
  type: 'GATHER_INTEL' | 'DESTABILIZE' | 'SUPPORT_REBELS' | 'COUNTER_INTEL' | 'SABOTAGE' | 'MISINFORMATION' | 'PROPAGANDA';
  cost: number; // Monthly cost in millions
  successChance: number; // Base success chance 0-100
}

export const COVERT_OPERATIONS: Record<CovertOperation['type'], Omit<CovertOperation, 'successChance'>> = {
  GATHER_INTEL: { type: 'GATHER_INTEL', cost: 50 },
  DESTABILIZE: { type: 'DESTABILIZE', cost: 100 },
  SUPPORT_REBELS: { type: 'SUPPORT_REBELS', cost: 150 },
  COUNTER_INTEL: { type: 'COUNTER_INTEL', cost: 75 },
  SABOTAGE: { type: 'SABOTAGE', cost: 200 },
  MISINFORMATION: { type: 'MISINFORMATION', cost: 100 },
  PROPAGANDA: { type: 'PROPAGANDA', cost: 75 },
};

export function calculateOperationSuccess(
  attacker: CountryState,
  defender: CountryState,
  operationType: CovertOperation['type']
): { success: boolean; chance: number } {
  const attackerIntel = attacker.intelLevel;
  const defenderCounterIntel = defender.counterIntelLevel ?? 50;
  
  // Base chance depends on intel difference
  let baseChance = 50 + (attackerIntel - defenderCounterIntel) / 2;
  
  // Operation-specific modifiers
  switch (operationType) {
    case 'GATHER_INTEL':
      baseChance += 10; // Easier operation
      break;
    case 'DESTABILIZE':
      // Easier if target already unstable
      if (defender.stability < 50) baseChance += 15;
      break;
    case 'SUPPORT_REBELS':
      // Requires existing insurgency
      if (!defender.insurgencyLevel || defender.insurgencyLevel === 'NONE') {
        baseChance -= 20;
      } else {
        baseChance += 10;
      }
      break;
    case 'SABOTAGE':
      baseChance -= 10; // Harder operation
      break;
    case 'MISINFORMATION':
      // Easier against democracies (free press)
      if (defender.regimeType === 'DEMOCRACY') baseChance += 10;
      break;
    case 'PROPAGANDA':
      baseChance += 5;
      break;
  }
  
  // Clamp to 5-95 range
  const chance = Math.max(5, Math.min(95, baseChance));
  const success = Math.random() * 100 < chance;
  
  return { success, chance };
}

export function applyOperationEffects(
  target: CountryState,
  operationType: CovertOperation['type'],
  success: boolean
): { stabilityChange: number; intelChange: number; description: string } {
  if (!success) {
    return { stabilityChange: 0, intelChange: 0, description: 'Operation failed' };
  }
  
  switch (operationType) {
    case 'GATHER_INTEL':
      return { 
        stabilityChange: 0, 
        intelChange: 10, 
        description: `Intelligence gathered on ${target.name}` 
      };
    case 'DESTABILIZE':
      return { 
        stabilityChange: -10, 
        intelChange: 0, 
        description: `Destabilization campaign reduces ${target.name} stability` 
      };
    case 'SUPPORT_REBELS':
      return { 
        stabilityChange: -15, 
        intelChange: 0, 
        description: `Rebel support escalates insurgency in ${target.name}` 
      };
    case 'SABOTAGE':
      return { 
        stabilityChange: -5, 
        intelChange: 0, 
        description: `Sabotage operation damages ${target.name} infrastructure` 
      };
    case 'MISINFORMATION':
      return { 
        stabilityChange: -5, 
        intelChange: 5, 
        description: `Misinformation campaign confuses ${target.name} intelligence` 
      };
    case 'PROPAGANDA':
      return { 
        stabilityChange: -8, 
        intelChange: 0, 
        description: `Propaganda undermines ${target.name} government` 
      };
    default:
      return { stabilityChange: 0, intelChange: 0, description: '' };
  }
}

export function getFailureConsequences(
  attacker: CountryState,
  defender: CountryState,
  operationType: CovertOperation['type']
): { relationChange: number; exposed: boolean; description: string } {
  // 50% chance of being exposed on failure
  const exposed = Math.random() < 0.5;
  
  if (!exposed) {
    return { relationChange: 0, exposed: false, description: 'Operation failed but not detected' };
  }
  
  // Diplomatic incident
  let relationChange = -15;
  if (operationType === 'SABOTAGE' || operationType === 'SUPPORT_REBELS') {
    relationChange = -30; // More severe
  }
  
  return {
    relationChange,
    exposed: true,
    description: `${attacker.name} covert operation exposed! ${defender.name} relations damaged.`
  };
}

export const INSURGENCY_STABILITY_COSTS: Record<InsurgencyLevel, number> = {
  NONE: 0,
  UNREST: -2,      // Per month
  REBELLION: -5,
  GUERILLA: -10,
};

export function escalateInsurgency(current: InsurgencyLevel | undefined): InsurgencyLevel {
  const levels: InsurgencyLevel[] = ['NONE', 'UNREST', 'REBELLION', 'GUERILLA'];
  const currentIndex = levels.indexOf(current ?? 'NONE');
  return levels[Math.min(currentIndex + 1, levels.length - 1)];
}

export function deescalateInsurgency(
  current: InsurgencyLevel | undefined, 
  tactic: 'SOFT' | 'HARD'
): { newLevel: InsurgencyLevel; stabilityPenalty: number; internationalOutcry: boolean } {
  const levels: InsurgencyLevel[] = ['NONE', 'UNREST', 'REBELLION', 'GUERILLA'];
  const currentIndex = levels.indexOf(current ?? 'NONE');
  
  if (currentIndex === 0) {
    return { newLevel: 'NONE', stabilityPenalty: 0, internationalOutcry: false };
  }
  
  if (tactic === 'HARD') {
    // Fast but causes outcry
    return {
      newLevel: levels[Math.max(0, currentIndex - 2)],
      stabilityPenalty: 5, // Short-term stability hit from violence
      internationalOutcry: true
    };
  } else {
    // Slow but no backlash
    return {
      newLevel: levels[Math.max(0, currentIndex - 1)],
      stabilityPenalty: 0,
      internationalOutcry: false
    };
  }
}
