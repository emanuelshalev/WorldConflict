import type { CountryState, RegimeType } from "../types.js";

export interface StabilityFactors {
  warEffect: number;
  economicEffect: number;
  legitimacyEffect: number;
  regimeEffect: number;
  totalDelta: number;
}

export class StabilitySystem {
  static calculateStabilityDelta(country: CountryState): StabilityFactors {
    const warEffect = StabilitySystem.calculateWarEffect(country);
    const economicEffect = StabilitySystem.calculateEconomicEffect(country);
    const legitimacyEffect = StabilitySystem.calculateLegitimacyEffect(country);
    const regimeEffect = StabilitySystem.calculateRegimeEffect(country);

    const totalDelta = warEffect + economicEffect + legitimacyEffect + regimeEffect;

    return {
      warEffect,
      economicEffect,
      legitimacyEffect,
      regimeEffect,
      totalDelta,
    };
  }

  private static calculateWarEffect(country: CountryState): number {
    if (country.atWarWith.length === 0) return 0;

    const baseWarPenalty = -8;
    const perWarPenalty = -3;
    return baseWarPenalty + (country.atWarWith.length - 1) * perWarPenalty;
  }

  private static calculateEconomicEffect(country: CountryState): number {
    const growthRate = country.growthRate;

    if (growthRate >= 0.05) return 3;
    if (growthRate >= 0.02) return 2;
    if (growthRate >= 0) return 0;
    if (growthRate >= -0.02) return -2;
    return -5;
  }

  private static calculateLegitimacyEffect(country: CountryState): number {
    const legitimacy = country.legitimacy;

    if (legitimacy >= 80) return 2;
    if (legitimacy >= 60) return 1;
    if (legitimacy >= 40) return 0;
    if (legitimacy >= 20) return -2;
    return -5;
  }

  private static calculateRegimeEffect(country: CountryState): number {
    const regimeModifiers: Record<RegimeType, number> = {
      DEMOCRACY: 1,
      AUTOCRACY: 0,
      THEOCRACY: 0,
      MILITARY_JUNTA: -1,
      COMMUNIST: 0,
      MONARCHY: 1,
    };

    return regimeModifiers[country.regimeType] ?? 0;
  }

  static applyStabilityUpdate(country: CountryState): CountryState {
    const factors = StabilitySystem.calculateStabilityDelta(country);
    const newStability = Math.max(0, Math.min(100, country.stability + factors.totalDelta));

    return {
      ...country,
      stability: newStability,
    };
  }

  static isCollapsed(country: CountryState): boolean {
    return country.stability <= 0;
  }

  static getStabilityStatus(stability: number): string {
    if (stability >= 80) return "STABLE";
    if (stability >= 60) return "SECURE";
    if (stability >= 40) return "UNCERTAIN";
    if (stability >= 20) return "UNSTABLE";
    return "CRITICAL";
  }

  static applyDiplomaticSuccess(country: CountryState, magnitude: number): CountryState {
    const bonus = Math.min(5, Math.max(2, magnitude));
    return {
      ...country,
      stability: Math.min(100, country.stability + bonus),
      legitimacy: Math.min(100, country.legitimacy + Math.floor(bonus / 2)),
    };
  }

  static applyDiplomaticFailure(country: CountryState, magnitude: number): CountryState {
    const penalty = Math.min(10, Math.max(2, magnitude));
    return {
      ...country,
      stability: Math.max(0, country.stability - penalty),
      legitimacy: Math.max(0, country.legitimacy - Math.floor(penalty / 2)),
    };
  }

  static applyPropaganda(country: CountryState): CountryState {
    return {
      ...country,
      legitimacy: Math.min(100, country.legitimacy + 5),
      stability: Math.min(100, country.stability + 2),
    };
  }

  static applyReform(country: CountryState): CountryState {
    return {
      ...country,
      stability: Math.min(100, country.stability + 8),
      legitimacy: Math.min(100, country.legitimacy + 3),
    };
  }

  static handleCollapse(country: CountryState): CountryState {
    return {
      ...country,
      stability: 0,
      legitimacy: 0,
      mobilizationLevel: 0,
      atWarWith: [],
      alliances: [],
    };
  }

  static checkAndHandleCollapse(country: CountryState): {
    country: CountryState;
    collapsed: boolean;
  } {
    if (StabilitySystem.isCollapsed(country)) {
      return {
        country: StabilitySystem.handleCollapse(country),
        collapsed: true,
      };
    }
    return { country, collapsed: false };
  }

  static applyAllStabilityUpdates(countries: CountryState[]): CountryState[] {
    return countries.map((country) => {
      const updated = StabilitySystem.applyStabilityUpdate(country);
      const { country: finalCountry } = StabilitySystem.checkAndHandleCollapse(updated);
      return finalCountry;
    });
  }
}
