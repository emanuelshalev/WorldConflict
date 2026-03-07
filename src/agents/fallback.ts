import type { Action, CountryIntent, CountryState, WorldState, PersonalityTraits } from "../core/types.js";

export interface FallbackConfig {
  aggressiveness: number;
  diplomaticBias: number;
  stabilityThreshold: number;
}

const DEFAULT_CONFIG: FallbackConfig = {
  aggressiveness: 0.5,
  diplomaticBias: 0.6,
  stabilityThreshold: 40,
};

// Default personality for countries without explicit traits
const DEFAULT_PERSONALITY: PersonalityTraits = {
  warPropensity: 50,
  allianceLoyalty: 50,
  diplomaticFlexibility: 50,
  riskTolerance: 50,
  expansionism: 30,
  isolationism: 30,
};

export class FallbackAI {
  private config: FallbackConfig;

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateIntent(country: CountryState, world: WorldState): CountryIntent {
    const actions: Action[] = [];
    const personality = country.personality ?? DEFAULT_PERSONALITY;

    if (country.stability < this.config.stabilityThreshold) {
      actions.push(...this.handleLowStability(country));
    }

    // Handle insurgency based on personality
    if (country.insurgencyLevel && country.insurgencyLevel !== 'NONE') {
      actions.push(...this.handleInsurgency(country, personality));
    }

    if (country.atWarWith.length > 0) {
      actions.push(...this.handleWartime(country, world, personality));
    } else {
      actions.push(...this.handlePeacetime(country, world, personality));
    }

    actions.push(...this.handleEconomy(country));

    // Apply personality-based scoring to actions
    const scoredActions = this.scoreActionsWithPersonality(actions, country, personality);
    const prioritizedActions = this.prioritizeActions(scoredActions, country);

    return {
      countryId: country.id,
      actions: prioritizedActions.slice(0, 2),
    };
  }

  private getPersonality(country: CountryState): PersonalityTraits {
    return country.personality ?? DEFAULT_PERSONALITY;
  }

  // Personality-based action scoring (from spec)
  private scoreActionsWithPersonality(
    actions: Action[],
    country: CountryState,
    personality: PersonalityTraits
  ): Action[] {
    return actions.map(action => {
      let score = 1.0;

      // Military actions modified by warPropensity
      if (action.type.startsWith('MILITARY_') || action.type === 'DIPLOMACY_DECLARE_WAR') {
        score *= (1 + personality.warPropensity / 100);
      }

      // Alliance actions modified by allianceLoyalty
      if (action.type.includes('ALLIANCE')) {
        score *= (1 + personality.allianceLoyalty / 100);
      }

      // Diplomatic actions modified by diplomaticFlexibility
      if (action.type.startsWith('DIPLOMACY_') && !action.type.includes('WAR')) {
        score *= (1 + personality.diplomaticFlexibility / 100);
      }

      // Risky actions modified by riskTolerance
      const riskyActions = ['DIPLOMACY_DECLARE_WAR', 'INTEL_DESTABILIZE', 'INTEL_SABOTAGE'];
      if (riskyActions.includes(action.type)) {
        score *= (personality.riskTolerance / 100);
      }

      // Historical pattern modifier (from spec)
      if (this.matchesHistoricalPattern(action, country)) {
        score *= 1.5;
      } else if (this.contradictsHistoricalPattern(action, country)) {
        score *= 0.5;
      }

      return { ...action, _score: score };
    }).sort((a, b) => ((b as any)._score ?? 0) - ((a as any)._score ?? 0));
  }

  private matchesHistoricalPattern(action: Action, country: CountryState): boolean {
    // Check if action target is a historical rival (for hostile actions)
    if (action.targetCountryId && country.historicalRivals?.includes(action.targetCountryId)) {
      if (action.type === 'DIPLOMACY_DECLARE_WAR' || action.type === 'DIPLOMACY_DENOUNCE') {
        return true;
      }
    }
    // Check if action target is a historical ally (for friendly actions)
    if (action.targetCountryId && country.historicalAllies?.includes(action.targetCountryId)) {
      if (action.type === 'DIPLOMACY_PROPOSE_ALLIANCE' || action.type === 'DIPLOMACY_IMPROVE_RELATIONS') {
        return true;
      }
    }
    return false;
  }

  private contradictsHistoricalPattern(action: Action, country: CountryState): boolean {
    // Allying with historical rival is contradictory
    if (action.targetCountryId && country.historicalRivals?.includes(action.targetCountryId)) {
      if (action.type === 'DIPLOMACY_PROPOSE_ALLIANCE') {
        return true;
      }
    }
    // Attacking historical ally is contradictory
    if (action.targetCountryId && country.historicalAllies?.includes(action.targetCountryId)) {
      if (action.type === 'DIPLOMACY_DECLARE_WAR') {
        return true;
      }
    }
    return false;
  }

  private handleInsurgency(country: CountryState, personality: PersonalityTraits): Action[] {
    const actions: Action[] = [];
    
    // Choose policing tactic based on personality
    // High warPropensity = prefer HARD tactics
    // High diplomaticFlexibility = prefer SOFT tactics
    const preferHard = personality.warPropensity > personality.diplomaticFlexibility;
    
    actions.push({
      type: 'DOMESTIC_POLICING',
      params: { tactic: preferHard ? 'HARD' : 'SOFT' }
    });

    return actions;
  }

  private handleLowStability(country: CountryState): Action[] {
    const actions: Action[] = [];

    if (country.stability < 30) {
      actions.push({ type: "DOMESTIC_REFORM" });
    } else if (country.legitimacy < 50) {
      actions.push({ type: "DOMESTIC_PROPAGANDA" });
    }

    return actions;
  }

  private handleWartime(country: CountryState, world: WorldState, personality: PersonalityTraits): Action[] {
    const actions: Action[] = [];

    if (country.mobilizationLevel < 80) {
      actions.push({ type: "MILITARY_MOBILIZE" });
    }

    for (const enemyId of country.atWarWith) {
      const war = world.wars.find(
        (w) =>
          (w.attackerId === country.id && w.defenderId === enemyId) ||
          (w.defenderId === country.id && w.attackerId === enemyId),
      );

      if (war) {
        const isAttacker = war.attackerId === country.id;
        const progress = isAttacker ? war.attackerProgress : war.defenderProgress;

        // Personality affects willingness to seek peace
        const peaceTendency = personality.diplomaticFlexibility / 100;
        const warTendency = personality.warPropensity / 100;
        
        const shouldSeekPeace =
          progress < 25 || 
          country.stability < 30 || 
          (country.manpower < 100000 && progress < 60) ||
          (progress < 40 && peaceTendency > warTendency);

        if (shouldSeekPeace) {
          actions.push({ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: enemyId });
        }
      }
    }

    return actions;
  }

  private handlePeacetime(country: CountryState, world: WorldState, personality: PersonalityTraits): Action[] {
    const actions: Action[] = [];

    // Demobilize based on isolationism - isolationist countries demobilize faster
    const demobThreshold = 30 - (personality.isolationism / 5);
    if (country.mobilizationLevel > demobThreshold) {
      actions.push({ type: "MILITARY_DEMOBILIZE" });
    }

    // Diplomatic bias modified by personality
    const diplomaticChance = this.config.diplomaticBias * (personality.diplomaticFlexibility / 50);
    
    const friendlyCountries = Object.entries(country.relations)
      .filter(([id, value]) => value >= 40 && value < 60 && !country.alliances.includes(id))
      .sort((a, b) => b[1] - a[1]);

    if (friendlyCountries.length > 0 && Math.random() < diplomaticChance) {
      const [targetId] = friendlyCountries[0];
      actions.push({ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: targetId });
    }

    // Alliance seeking modified by allianceLoyalty
    const potentialAllies = Object.entries(country.relations)
      .filter(([id, value]) => value >= 60 && !country.alliances.includes(id))
      .sort((a, b) => b[1] - a[1]);

    if (potentialAllies.length > 0 && personality.allianceLoyalty > 30) {
      const [targetId] = potentialAllies[0];
      actions.push({ type: "DIPLOMACY_PROPOSE_ALLIANCE", targetCountryId: targetId });
    }

    // War consideration modified by personality
    if (this.shouldConsiderWar(country, world, personality)) {
      const warTarget = this.selectWarTarget(country, world, personality);
      if (warTarget) {
        actions.push({ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: warTarget });
      }
    }

    return actions;
  }

  private shouldConsiderWar(country: CountryState, _world: WorldState, personality: PersonalityTraits): boolean {
    if (country.stability < 60) return false;
    if (country.atWarWith.length > 0) return false;

    // Personality-based war consideration
    const warPropensityFactor = personality.warPropensity / 100;
    const riskFactor = personality.riskTolerance / 100;
    const expansionFactor = personality.expansionism / 100;
    const isolationPenalty = personality.isolationism / 100;

    // Combined war likelihood
    const warLikelihood = (warPropensityFactor + riskFactor + expansionFactor) / 3 - isolationPenalty;

    return Math.random() < warLikelihood * 0.15;
  }

  private selectWarTarget(country: CountryState, world: WorldState, personality: PersonalityTraits): string | null {
    const hostileCountries = Object.entries(country.relations)
      .filter(([_, value]) => value < -60)
      .map(([id]) => id);

    if (hostileCountries.length === 0) return null;

    // Prioritize historical rivals
    const historicalRivals = country.historicalRivals ?? [];
    
    const viableTargets = hostileCountries
      .map((id) => world.countries.find((c) => c.id === id))
      .filter((c): c is CountryState => c !== undefined)
      .filter((target) => {
        const ourStrength = this.calculateMilitaryStrength(country);
        const theirStrength = this.calculateMilitaryStrength(target);
        // Risk tolerance affects required strength advantage
        const requiredAdvantage = 1.5 - (personality.riskTolerance / 200); // 1.0 to 1.5
        return ourStrength > theirStrength * requiredAdvantage;
      })
      .sort((a, b) => {
        // Prioritize historical rivals
        const aIsRival = historicalRivals.includes(a.id) ? -100 : 0;
        const bIsRival = historicalRivals.includes(b.id) ? -100 : 0;
        return (a.stability + aIsRival) - (b.stability + bIsRival);
      });

    return viableTargets.length > 0 ? viableTargets[0].id : null;
  }

  private calculateMilitaryStrength(country: CountryState): number {
    const mobilizationFactor = country.mobilizationLevel / 100;
    return country.manpower * mobilizationFactor + country.airpower * 10;
  }

  private handleEconomy(country: CountryState): Action[] {
    const actions: Action[] = [];

    if (country.atWarWith.length > 0 && country.militaryBudgetPercent < 5) {
      actions.push({
        type: "ECONOMY_ADJUST_MILITARY_BUDGET",
        value: Math.min(10, country.militaryBudgetPercent + 2),
      });
    } else if (country.atWarWith.length === 0 && country.militaryBudgetPercent > 4) {
      actions.push({
        type: "ECONOMY_ADJUST_MILITARY_BUDGET",
        value: Math.max(2, country.militaryBudgetPercent - 1),
      });
    }

    return actions;
  }

  private prioritizeActions(actions: Action[], country: CountryState): Action[] {
    const priorityOrder: Record<string, number> = {
      DOMESTIC_REFORM: country.stability < 30 ? 100 : 50,
      DOMESTIC_PROPAGANDA: 40,
      MILITARY_MOBILIZE: country.atWarWith.length > 0 ? 90 : 20,
      MILITARY_DEMOBILIZE: 30,
      DIPLOMACY_PROPOSE_CEASEFIRE: country.stability < 40 ? 95 : 60,
      DIPLOMACY_IMPROVE_RELATIONS: 45,
      DIPLOMACY_PROPOSE_ALLIANCE: 55,
      DIPLOMACY_DECLARE_WAR: 35,
      DIPLOMACY_DENOUNCE: 25,
      ECONOMY_ADJUST_MILITARY_BUDGET: 40,
    };

    return actions.sort((a, b) => {
      const priorityA = priorityOrder[a.type] ?? 0;
      const priorityB = priorityOrder[b.type] ?? 0;
      return priorityB - priorityA;
    });
  }
}

export function generateFallbackIntents(world: WorldState): CountryIntent[] {
  const _fallbackAI = new FallbackAI();
  const intents: CountryIntent[] = [];

  for (const country of world.countries) {
    if (country.id === world.playerCountryId) continue;

    const countryConfig: Partial<FallbackConfig> = {
      aggressiveness: country.riskTolerance / 100,
    };

    const ai = new FallbackAI(countryConfig);
    intents.push(ai.generateIntent(country, world));
  }

  return intents;
}
