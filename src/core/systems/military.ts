import type { SeededRandom } from "../seed.js";
import type { ActiveWar, CountryState, WorldState } from "../types.js";

export interface WarResolutionResult {
  war: ActiveWar;
  attackerCasualties: number;
  defenderCasualties: number;
  progressDelta: number;
  isOver: boolean;
  winner?: string;
}

export class MilitarySystem {
  static calculateMilitaryStrength(country: CountryState): number {
    const mobilizationFactor = country.mobilizationLevel / 100;
    const manpowerStrength = country.manpower * mobilizationFactor;
    const airpowerStrength = country.airpower * 10;
    return manpowerStrength + airpowerStrength;
  }

  static getEffectiveForce(country: CountryState): number {
    const baseStrength = MilitarySystem.calculateMilitaryStrength(country);
    const stabilityModifier = country.stability / 100;
    const legitimacyModifier = country.legitimacy / 100;
    return baseStrength * stabilityModifier * legitimacyModifier;
  }

  static mobilize(country: CountryState, targetLevel: number): CountryState {
    const newLevel = Math.max(0, Math.min(100, targetLevel));
    const levelChange = newLevel - country.mobilizationLevel;

    let stabilityDelta = 0;
    if (levelChange > 0) {
      stabilityDelta = -Math.floor(levelChange / 10);
    } else {
      stabilityDelta = Math.floor(Math.abs(levelChange) / 20);
    }

    return {
      ...country,
      mobilizationLevel: newLevel,
      stability: Math.max(0, Math.min(100, country.stability + stabilityDelta)),
    };
  }

  static demobilize(country: CountryState, amount: number): CountryState {
    const newLevel = Math.max(0, country.mobilizationLevel - amount);
    return {
      ...country,
      mobilizationLevel: newLevel,
      stability: Math.min(100, country.stability + 1),
    };
  }

  static resolveWarMonth(
    war: ActiveWar,
    attacker: CountryState,
    defender: CountryState,
    rng: SeededRandom,
  ): WarResolutionResult {
    const attackerStrength = MilitarySystem.getEffectiveForce(attacker);
    const defenderStrength = MilitarySystem.getEffectiveForce(defender);
    const totalStrength = attackerStrength + defenderStrength;

    if (totalStrength === 0) {
      return {
        war,
        attackerCasualties: 0,
        defenderCasualties: 0,
        progressDelta: 0,
        isOver: false,
      };
    }

    const attackerRatio = attackerStrength / totalStrength;
    const defenderRatio = defenderStrength / totalStrength;

    const battleRoll = rng.next();
    const progressDelta = (battleRoll - 0.5) * 10 * (attackerRatio - defenderRatio + 0.5);

    const newAttackerProgress = Math.max(0, Math.min(100, war.attackerProgress + progressDelta));

    const baseCasualtyRate = 0.001;
    const attackerCasualties = Math.floor(attacker.manpower * baseCasualtyRate * defenderRatio);
    const defenderCasualties = Math.floor(defender.manpower * baseCasualtyRate * attackerRatio);

    const updatedWar: ActiveWar = {
      ...war,
      attackerProgress: newAttackerProgress,
      defenderProgress: 100 - newAttackerProgress,
      attackerCasualties: war.attackerCasualties + attackerCasualties,
      defenderCasualties: war.defenderCasualties + defenderCasualties,
    };

    let isOver = false;
    let winner: string | undefined;

    if (newAttackerProgress >= 100) {
      isOver = true;
      winner = war.attackerId;
    } else if (newAttackerProgress <= 0) {
      isOver = true;
      winner = war.defenderId;
    }

    return {
      war: updatedWar,
      attackerCasualties,
      defenderCasualties,
      progressDelta,
      isOver,
      winner,
    };
  }

  static applyWarAttrition(country: CountryState, casualties: number): CountryState {
    const stabilityLoss = 5;
    const gdpPenalty = 0.02;

    return {
      ...country,
      manpower: Math.max(0, country.manpower - casualties),
      stability: Math.max(0, country.stability - stabilityLoss),
      gdp: country.gdp * (1 - gdpPenalty),
    };
  }

  static resolveAllWars(
    world: WorldState,
    rng: SeededRandom,
  ): { world: WorldState; results: WarResolutionResult[] } {
    const results: WarResolutionResult[] = [];
    const newWars: ActiveWar[] = [];
    const newCountries = [...world.countries];

    for (const war of world.wars) {
      const attackerIndex = newCountries.findIndex((c) => c.id === war.attackerId);
      const defenderIndex = newCountries.findIndex((c) => c.id === war.defenderId);

      if (attackerIndex === -1 || defenderIndex === -1) {
        newWars.push(war);
        continue;
      }

      const attacker = newCountries[attackerIndex];
      const defender = newCountries[defenderIndex];

      const result = MilitarySystem.resolveWarMonth(war, attacker, defender, rng);
      results.push(result);

      newCountries[attackerIndex] = MilitarySystem.applyWarAttrition(
        attacker,
        result.attackerCasualties,
      );
      newCountries[defenderIndex] = MilitarySystem.applyWarAttrition(
        defender,
        result.defenderCasualties,
      );

      if (!result.isOver) {
        newWars.push(result.war);
      } else {
        newCountries[attackerIndex] = {
          ...newCountries[attackerIndex],
          atWarWith: newCountries[attackerIndex].atWarWith.filter((w) => w !== war.defenderId),
        };
        newCountries[defenderIndex] = {
          ...newCountries[defenderIndex],
          atWarWith: newCountries[defenderIndex].atWarWith.filter((w) => w !== war.attackerId),
        };
      }
    }

    return {
      world: {
        ...world,
        countries: newCountries,
        wars: newWars,
      },
      results,
    };
  }

  static canDeclareWar(attacker: CountryState, defender: CountryState): boolean {
    if (attacker.atWarWith.includes(defender.id)) return false;
    if (attacker.alliances.includes(defender.id)) return false;
    return true;
  }

  static startWar(world: WorldState, attackerId: string, defenderId: string): WorldState {
    const attackerIndex = world.countries.findIndex((c) => c.id === attackerId);
    const defenderIndex = world.countries.findIndex((c) => c.id === defenderId);

    if (attackerIndex === -1 || defenderIndex === -1) {
      throw new Error("Invalid country IDs");
    }

    const attacker = world.countries[attackerIndex];
    const defender = world.countries[defenderIndex];

    if (!MilitarySystem.canDeclareWar(attacker, defender)) {
      throw new Error(`${attackerId} cannot declare war on ${defenderId}`);
    }

    const newWar: ActiveWar = {
      id: `war_${attackerId}_${defenderId}_${world.turn}`,
      attackerId,
      defenderId,
      startTurn: world.turn,
      attackerProgress: 50,
      defenderProgress: 50,
      attackerCasualties: 0,
      defenderCasualties: 0,
    };

    const newCountries = [...world.countries];
    newCountries[attackerIndex] = {
      ...attacker,
      atWarWith: [...attacker.atWarWith, defenderId],
      relations: { ...attacker.relations, [defenderId]: -100 },
    };
    newCountries[defenderIndex] = {
      ...defender,
      atWarWith: [...defender.atWarWith, attackerId],
      relations: { ...defender.relations, [attackerId]: -100 },
    };

    return {
      ...world,
      countries: newCountries,
      wars: [...world.wars, newWar],
      globalTension: Math.min(100, world.globalTension + 15),
    };
  }

  static getMilitaryRanking(countries: CountryState[]): CountryState[] {
    return [...countries].sort(
      (a, b) =>
        MilitarySystem.calculateMilitaryStrength(b) - MilitarySystem.calculateMilitaryStrength(a),
    );
  }
}
