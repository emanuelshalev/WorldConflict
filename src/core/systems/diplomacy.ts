import type { CountryState, WorldState } from "../types.js";

export const RELATION_THRESHOLDS = {
  WAR_ELIGIBLE: -60,
  HOSTILE: -20,
  NEUTRAL: 0,
  FRIENDLY: 20,
  ALLIANCE_ELIGIBLE: 60,
  MILITARY_PACT: 80,
} as const;

export interface DiplomacyResult {
  success: boolean;
  newRelation?: number;
  message: string;
}

export class DiplomacySystem {
  static getRelation(country: CountryState, targetId: string): number {
    return country.relations[targetId] ?? 0;
  }

  static setRelation(country: CountryState, targetId: string, value: number): CountryState {
    const clampedValue = Math.max(-100, Math.min(100, value));
    return {
      ...country,
      relations: {
        ...country.relations,
        [targetId]: clampedValue,
      },
    };
  }

  static modifyRelation(country: CountryState, targetId: string, delta: number): CountryState {
    const current = DiplomacySystem.getRelation(country, targetId);
    return DiplomacySystem.setRelation(country, targetId, current + delta);
  }

  static getRelationStatus(relation: number): string {
    if (relation <= RELATION_THRESHOLDS.WAR_ELIGIBLE) return "WAR_ELIGIBLE";
    if (relation <= RELATION_THRESHOLDS.HOSTILE) return "HOSTILE";
    if (relation < RELATION_THRESHOLDS.FRIENDLY) return "NEUTRAL";
    if (relation < RELATION_THRESHOLDS.ALLIANCE_ELIGIBLE) return "FRIENDLY";
    if (relation < RELATION_THRESHOLDS.MILITARY_PACT) return "ALLIANCE_ELIGIBLE";
    return "MILITARY_PACT";
  }

  static canDeclareWar(country: CountryState, targetId: string): boolean {
    if (country.atWarWith.includes(targetId)) return false;
    if (country.alliances.includes(targetId)) return false;
    return true;
  }

  static canFormAlliance(country: CountryState, targetId: string): boolean {
    if (country.alliances.includes(targetId)) return false;
    if (country.atWarWith.includes(targetId)) return false;
    const relation = DiplomacySystem.getRelation(country, targetId);
    return relation >= RELATION_THRESHOLDS.ALLIANCE_ELIGIBLE;
  }

  static declareWar(
    attacker: CountryState,
    defender: CountryState,
  ): { attacker: CountryState; defender: CountryState } {
    if (!DiplomacySystem.canDeclareWar(attacker, defender.id)) {
      throw new Error(`${attacker.id} cannot declare war on ${defender.id}`);
    }

    const newAttacker: CountryState = {
      ...attacker,
      atWarWith: [...attacker.atWarWith, defender.id],
      relations: {
        ...attacker.relations,
        [defender.id]: -100,
      },
    };

    const newDefender: CountryState = {
      ...defender,
      atWarWith: [...defender.atWarWith, attacker.id],
      relations: {
        ...defender.relations,
        [attacker.id]: -100,
      },
    };

    return { attacker: newAttacker, defender: newDefender };
  }

  static formAlliance(
    country1: CountryState,
    country2: CountryState,
  ): { country1: CountryState; country2: CountryState } {
    if (!DiplomacySystem.canFormAlliance(country1, country2.id)) {
      throw new Error(`${country1.id} cannot form alliance with ${country2.id}`);
    }

    const newCountry1: CountryState = {
      ...country1,
      alliances: [...country1.alliances, country2.id],
    };

    const newCountry2: CountryState = {
      ...country2,
      alliances: [...country2.alliances, country1.id],
    };

    return { country1: newCountry1, country2: newCountry2 };
  }

  static breakAlliance(
    country1: CountryState,
    country2: CountryState,
  ): { country1: CountryState; country2: CountryState } {
    if (!country1.alliances.includes(country2.id)) {
      throw new Error(`${country1.id} is not allied with ${country2.id}`);
    }

    const newCountry1: CountryState = {
      ...country1,
      alliances: country1.alliances.filter((a) => a !== country2.id),
      relations: {
        ...country1.relations,
        [country2.id]: Math.max(-100, (country1.relations[country2.id] ?? 0) - 30),
      },
    };

    const newCountry2: CountryState = {
      ...country2,
      alliances: country2.alliances.filter((a) => a !== country1.id),
      relations: {
        ...country2.relations,
        [country1.id]: Math.max(-100, (country2.relations[country1.id] ?? 0) - 30),
      },
    };

    return { country1: newCountry1, country2: newCountry2 };
  }

  static proposeCeasefire(
    country1: CountryState,
    country2: CountryState,
  ): { country1: CountryState; country2: CountryState } | null {
    if (!country1.atWarWith.includes(country2.id)) {
      return null;
    }

    const newCountry1: CountryState = {
      ...country1,
      atWarWith: country1.atWarWith.filter((w) => w !== country2.id),
      relations: {
        ...country1.relations,
        [country2.id]: -20,
      },
    };

    const newCountry2: CountryState = {
      ...country2,
      atWarWith: country2.atWarWith.filter((w) => w !== country1.id),
      relations: {
        ...country2.relations,
        [country1.id]: -20,
      },
    };

    return { country1: newCountry1, country2: newCountry2 };
  }

  static improveRelations(country: CountryState, targetId: string): CountryState {
    return DiplomacySystem.modifyRelation(country, targetId, 5);
  }

  static denounce(country: CountryState, targetId: string): CountryState {
    return DiplomacySystem.modifyRelation(country, targetId, -10);
  }

  static generateInitialRelations(countries: CountryState[]): Map<string, Record<string, number>> {
    const relations = new Map<string, Record<string, number>>();

    const historicalAllies: Record<string, string[]> = {
      USA: ["GBR", "CAN", "DEU", "FRA", "JPN", "KOR", "AUS", "ISR", "ITA", "POL"],
      CHN: ["PRK", "RUS", "PAK"],
      RUS: ["CHN", "IRN", "PRK"],
      DEU: ["FRA", "GBR", "USA", "POL", "ITA"],
      IND: ["USA", "JPN", "AUS", "FRA"],
      GBR: ["USA", "FRA", "DEU", "CAN", "AUS"],
      FRA: ["DEU", "GBR", "USA", "ITA"],
      JPN: ["USA", "KOR", "AUS", "IND"],
      SAU: ["USA", "EGY", "PAK"],
      IRN: ["RUS", "CHN"],
      ISR: ["USA"],
      TUR: ["USA", "GBR"],
    };

    const historicalRivals: Record<string, string[]> = {
      USA: ["RUS", "CHN", "IRN", "PRK"],
      CHN: ["USA", "JPN", "IND"],
      RUS: ["USA", "GBR", "POL"],
      IND: ["PAK", "CHN"],
      PAK: ["IND"],
      ISR: ["IRN", "SAU"],
      IRN: ["USA", "ISR", "SAU"],
      KOR: ["PRK"],
      PRK: ["USA", "KOR", "JPN"],
      SAU: ["IRN"],
    };

    for (const country of countries) {
      const countryRelations: Record<string, number> = {};

      for (const other of countries) {
        if (other.id === country.id) continue;

        let baseRelation = 0;

        if (historicalAllies[country.id]?.includes(other.id)) {
          baseRelation = 50 + Math.floor(Math.random() * 30);
        } else if (historicalRivals[country.id]?.includes(other.id)) {
          baseRelation = -50 - Math.floor(Math.random() * 30);
        } else {
          baseRelation = Math.floor(Math.random() * 40) - 20;
        }

        countryRelations[other.id] = Math.max(-100, Math.min(100, baseRelation));
      }

      relations.set(country.id, countryRelations);
    }

    return relations;
  }

  static applyRelationsToWorld(
    world: WorldState,
    relations: Map<string, Record<string, number>>,
  ): WorldState {
    const newCountries = world.countries.map((country) => ({
      ...country,
      relations: relations.get(country.id) ?? country.relations,
    }));

    return {
      ...world,
      countries: newCountries,
    };
  }
}
