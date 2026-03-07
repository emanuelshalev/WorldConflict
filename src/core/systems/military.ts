import type { SeededRandom } from "../seed.js";
import type { ActiveWar, CountryState, WorldState, MilitaryUnits, BorderDeployment, UnitType } from "../types.js";

// Unit costs (from spec)
export const UNIT_COSTS: Record<string, number> = {
  tanks: 50,        // $50M per unit
  helicopters: 30,  // $30M per unit
  sams: 25,         // $25M per unit
  fighters: 80,     // $80M per unit
  infantry: 5,      // $5M per 1000 troops
};

// Rock-paper-scissors combat effectiveness (from spec)
export const UNIT_EFFECTIVENESS: Record<string, Record<string, number>> = {
  tanks: { infantry: 2.0, helicopters: 0.5, sams: 1.0, fighters: 0.3, tanks: 1.0 },
  helicopters: { tanks: 2.0, infantry: 1.5, sams: 0.3, fighters: 0.5, helicopters: 1.0 },
  sams: { fighters: 2.5, helicopters: 2.0, tanks: 0.5, infantry: 0.5, sams: 1.0 },
  fighters: { helicopters: 2.0, tanks: 1.5, infantry: 1.0, sams: 0.3, fighters: 1.0 },
  infantry: { sams: 1.5, tanks: 0.5, helicopters: 0.7, fighters: 0.3, infantry: 1.0 },
};

// Airstrike target types (from spec)
export type AirstrikeTarget = 'MILITARY' | 'CIVILIAN' | 'INDUSTRIAL' | 'NUCLEAR';

export interface AirstrikeResult {
  success: boolean;
  targetType: AirstrikeTarget;
  damage: number;
  effects: {
    manpowerLoss?: number;
    stabilityLoss?: number;
    gdpLoss?: number;
    nuclearDelay?: number;
  };
  warCrimeRisk: boolean;
  description: string;
}

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

  // ============================================================================
  // NEW: Precision Airstrikes (Pre-war)
  // ============================================================================

  static executeAirstrike(
    attacker: CountryState,
    defender: CountryState,
    targetType: AirstrikeTarget,
    rng: SeededRandom
  ): AirstrikeResult {
    // Success based on attacker airpower vs defender SAMs
    const attackerAir = attacker.airpower + (attacker.units?.fighters ?? 0) * 10;
    const defenderAir = (defender.units?.sams ?? 0) * 15 + (defender.units?.fighters ?? 0) * 5;
    
    const successChance = Math.min(90, Math.max(20, 50 + (attackerAir - defenderAir) / 100));
    const success = rng.next() * 100 < successChance;

    if (!success) {
      return {
        success: false,
        targetType,
        damage: 0,
        effects: {},
        warCrimeRisk: false,
        description: `Airstrike on ${defender.name} ${targetType} targets failed - intercepted by air defenses`
      };
    }

    const effects: AirstrikeResult['effects'] = {};
    let warCrimeRisk = false;
    let description = '';

    switch (targetType) {
      case 'MILITARY':
        effects.manpowerLoss = Math.floor(defender.manpower * 0.1);
        description = `Airstrike destroys ${defender.name} military installations (-10% manpower)`;
        break;
      case 'CIVILIAN':
        effects.stabilityLoss = 15;
        warCrimeRisk = true;
        description = `Airstrike hits ${defender.name} civilian areas (-15 stability, WAR CRIME RISK)`;
        break;
      case 'INDUSTRIAL':
        effects.gdpLoss = 0.02;
        description = `Airstrike damages ${defender.name} industrial capacity (-2% GDP)`;
        break;
      case 'NUCLEAR':
        if (defender.nuclearStatus === 'DEVELOPING') {
          const currentStrikes = defender.nuclearStrikesReceived ?? 0;
          effects.nuclearDelay = 1;
          if (currentStrikes >= 1) {
            description = `Second strike on ${defender.name} nuclear facility - PROGRAM CRIPPLED (Two-Strike Rule)`;
          } else {
            description = `Airstrike damages ${defender.name} nuclear facility - program delayed`;
          }
        } else {
          description = `Airstrike on ${defender.name} - no active nuclear program to target`;
        }
        break;
    }

    return {
      success: true,
      targetType,
      damage: 1,
      effects,
      warCrimeRisk,
      description
    };
  }

  static applyAirstrikeEffects(country: CountryState, result: AirstrikeResult): CountryState {
    if (!result.success) return country;

    let updated = { ...country };

    if (result.effects.manpowerLoss) {
      updated.manpower = Math.max(0, updated.manpower - result.effects.manpowerLoss);
    }
    if (result.effects.stabilityLoss) {
      updated.stability = Math.max(0, updated.stability - result.effects.stabilityLoss);
    }
    if (result.effects.gdpLoss) {
      updated.gdp = updated.gdp * (1 - result.effects.gdpLoss);
    }
    if (result.effects.nuclearDelay && updated.nuclearStatus === 'DEVELOPING') {
      updated.nuclearStrikesReceived = (updated.nuclearStrikesReceived ?? 0) + 1;
      if (updated.nuclearStrikesReceived >= 2) {
        updated.nuclearStatus = 'LATENT'; // Program crippled
      }
    }

    return updated;
  }

  // ============================================================================
  // NEW: Border Troop Deployment
  // ============================================================================

  static deployToBorder(
    country: CountryState,
    targetCountryId: string,
    troops: number
  ): { country: CountryState; relationPenalty: number } {
    const existingDeployments = country.borderDeployments ?? [];
    const existingIndex = existingDeployments.findIndex(d => d.targetCountryId === targetCountryId);

    let newDeployments: BorderDeployment[];
    if (existingIndex >= 0) {
      newDeployments = [...existingDeployments];
      newDeployments[existingIndex] = {
        ...newDeployments[existingIndex],
        troops: newDeployments[existingIndex].troops + troops
      };
    } else {
      newDeployments = [...existingDeployments, { targetCountryId, troops }];
    }

    return {
      country: { ...country, borderDeployments: newDeployments },
      relationPenalty: -5 // Deploying troops degrades relations
    };
  }

  static withdrawFromBorder(
    country: CountryState,
    targetCountryId: string,
    troops: number
  ): CountryState {
    const existingDeployments = country.borderDeployments ?? [];
    const newDeployments = existingDeployments
      .map(d => {
        if (d.targetCountryId === targetCountryId) {
          return { ...d, troops: Math.max(0, d.troops - troops) };
        }
        return d;
      })
      .filter(d => d.troops > 0);

    return { ...country, borderDeployments: newDeployments };
  }

  // ============================================================================
  // NEW: Unit-based Combat Resolution (Rock-Paper-Scissors)
  // ============================================================================

  static calculateUnitStrength(units: MilitaryUnits | undefined): number {
    if (!units) return 0;
    return (
      units.tanks * 100 +
      units.helicopters * 80 +
      units.sams * 60 +
      units.fighters * 120 +
      units.infantry * 10
    );
  }

  static resolveUnitCombat(
    attackerUnits: MilitaryUnits | undefined,
    defenderUnits: MilitaryUnits | undefined,
    rng: SeededRandom
  ): { attackerAdvantage: number; description: string } {
    if (!attackerUnits || !defenderUnits) {
      return { attackerAdvantage: 0, description: 'No unit data available' };
    }

    let attackerScore = 0;
    let defenderScore = 0;

    // Calculate effectiveness based on unit matchups
    const unitTypes = ['tanks', 'helicopters', 'sams', 'fighters', 'infantry'] as const;
    
    for (const attackerType of unitTypes) {
      const attackerCount = attackerUnits[attackerType];
      if (attackerCount === 0) continue;

      for (const defenderType of unitTypes) {
        const defenderCount = defenderUnits[defenderType];
        if (defenderCount === 0) continue;

        const effectiveness = UNIT_EFFECTIVENESS[attackerType][defenderType];
        attackerScore += attackerCount * effectiveness;
      }
    }

    for (const defenderType of unitTypes) {
      const defenderCount = defenderUnits[defenderType];
      if (defenderCount === 0) continue;

      for (const attackerType of unitTypes) {
        const attackerCount = attackerUnits[attackerType];
        if (attackerCount === 0) continue;

        const effectiveness = UNIT_EFFECTIVENESS[defenderType][attackerType];
        defenderScore += defenderCount * effectiveness;
      }
    }

    const total = attackerScore + defenderScore;
    if (total === 0) return { attackerAdvantage: 0, description: 'Stalemate' };

    const advantage = ((attackerScore - defenderScore) / total) * 100;
    
    let description = '';
    if (advantage > 20) description = 'Attacker has significant unit advantage';
    else if (advantage > 5) description = 'Attacker has slight unit advantage';
    else if (advantage < -20) description = 'Defender has significant unit advantage';
    else if (advantage < -5) description = 'Defender has slight unit advantage';
    else description = 'Forces are evenly matched';

    return { attackerAdvantage: advantage, description };
  }

  // ============================================================================
  // NEW: Defense Budget as Hostility Indicator
  // ============================================================================

  static calculateDefenseBudget(country: CountryState): number {
    // Base: percentage of GDP
    const baseBudget = country.gdp * (country.militaryBudgetPercent / 100);
    
    // War multiplier
    const atWar = country.atWarWith.length > 0;
    const warMultiplier = atWar ? 3.0 : 1.0;
    
    return baseBudget * warMultiplier;
  }

  static getDefenseBudgetLevel(budget: number): 'PEACE' | 'TENSION' | 'WAR' {
    if (budget < 150) return 'PEACE';      // ~$100M baseline
    if (budget < 400) return 'TENSION';    // Elevated
    return 'WAR';                          // $300M+ indicates war footing
  }
}
