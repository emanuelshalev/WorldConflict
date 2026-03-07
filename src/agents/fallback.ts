import type { Action, CountryIntent, CountryState, WorldState } from "../core/types.js";

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

export class FallbackAI {
  private config: FallbackConfig;

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateIntent(country: CountryState, world: WorldState): CountryIntent {
    const actions: Action[] = [];

    if (country.stability < this.config.stabilityThreshold) {
      actions.push(...this.handleLowStability(country));
    }

    if (country.atWarWith.length > 0) {
      actions.push(...this.handleWartime(country, world));
    } else {
      actions.push(...this.handlePeacetime(country, world));
    }

    actions.push(...this.handleEconomy(country));

    const prioritizedActions = this.prioritizeActions(actions, country);

    return {
      countryId: country.id,
      actions: prioritizedActions.slice(0, 2),
    };
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

  private handleWartime(country: CountryState, world: WorldState): Action[] {
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

        const shouldSeekPeace =
          progress < 25 || country.stability < 30 || (country.manpower < 100000 && progress < 60);

        if (shouldSeekPeace) {
          actions.push({ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: enemyId });
        }
      }
    }

    return actions;
  }

  private handlePeacetime(country: CountryState, world: WorldState): Action[] {
    const actions: Action[] = [];

    if (country.mobilizationLevel > 30) {
      actions.push({ type: "MILITARY_DEMOBILIZE" });
    }

    const friendlyCountries = Object.entries(country.relations)
      .filter(([id, value]) => value >= 40 && value < 60 && !country.alliances.includes(id))
      .sort((a, b) => b[1] - a[1]);

    if (friendlyCountries.length > 0 && Math.random() < this.config.diplomaticBias) {
      const [targetId] = friendlyCountries[0];
      actions.push({ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: targetId });
    }

    const potentialAllies = Object.entries(country.relations)
      .filter(([id, value]) => value >= 60 && !country.alliances.includes(id))
      .sort((a, b) => b[1] - a[1]);

    if (potentialAllies.length > 0) {
      const [targetId] = potentialAllies[0];
      actions.push({ type: "DIPLOMACY_PROPOSE_ALLIANCE", targetCountryId: targetId });
    }

    if (this.shouldConsiderWar(country, world)) {
      const warTarget = this.selectWarTarget(country, world);
      if (warTarget) {
        actions.push({ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: warTarget });
      }
    }

    return actions;
  }

  private shouldConsiderWar(country: CountryState, _world: WorldState): boolean {
    if (country.stability < 60) return false;
    if (country.atWarWith.length > 0) return false;

    const riskFactor = country.riskTolerance / 100;
    const aggressionFactor = this.config.aggressiveness;

    return Math.random() < riskFactor * aggressionFactor * 0.1;
  }

  private selectWarTarget(country: CountryState, world: WorldState): string | null {
    const hostileCountries = Object.entries(country.relations)
      .filter(([_, value]) => value < -60)
      .map(([id]) => id);

    if (hostileCountries.length === 0) return null;

    const viableTargets = hostileCountries
      .map((id) => world.countries.find((c) => c.id === id))
      .filter((c): c is CountryState => c !== undefined)
      .filter((target) => {
        const ourStrength = this.calculateMilitaryStrength(country);
        const theirStrength = this.calculateMilitaryStrength(target);
        return ourStrength > theirStrength * 1.2;
      })
      .sort((a, b) => a.stability - b.stability);

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
