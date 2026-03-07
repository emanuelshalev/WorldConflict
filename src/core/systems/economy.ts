import type { CountryState } from "../types.js";

export interface EconomyUpdate {
  newGdp: number;
  newGrowthRate: number;
  militaryBudget: number;
}

export class EconomySystem {
  static calculateMilitaryBudget(country: CountryState): number {
    return country.gdp * (country.militaryBudgetPercent / 100);
  }

  static updateGdp(country: CountryState): CountryState {
    const warPenalty = country.atWarWith.length * 0.02;
    const instabilityEffect = (100 - country.stability) / 1000;
    const debtDrag = Math.max(0, (country.debtGdpRatio - 1) * 0.01);

    const effectiveGrowth = country.growthRate - warPenalty - instabilityEffect - debtDrag;
    const newGdp = country.gdp * (1 + effectiveGrowth);

    return {
      ...country,
      gdp: Math.max(0, newGdp),
    };
  }

  static adjustMilitaryBudget(country: CountryState, newPercent: number): CountryState {
    const clampedPercent = Math.max(0, Math.min(20, newPercent));

    let stabilityDelta = 0;
    const currentPercent = country.militaryBudgetPercent;

    if (clampedPercent > currentPercent + 2) {
      stabilityDelta = -2;
    } else if (clampedPercent < currentPercent - 2) {
      stabilityDelta = 1;
    }

    return {
      ...country,
      militaryBudgetPercent: clampedPercent,
      stability: Math.max(0, Math.min(100, country.stability + stabilityDelta)),
    };
  }

  static calculateGrowthRate(country: CountryState): number {
    let baseGrowth = country.growthRate;

    if (country.stability < 30) {
      baseGrowth -= 0.02;
    } else if (country.stability > 70) {
      baseGrowth += 0.005;
    }

    if (country.militaryBudgetPercent > 10) {
      baseGrowth -= (country.militaryBudgetPercent - 10) * 0.002;
    }

    if (country.debtGdpRatio > 1.5) {
      baseGrowth -= (country.debtGdpRatio - 1.5) * 0.01;
    }

    return Math.max(-0.1, Math.min(0.15, baseGrowth));
  }

  static applyMonthlyEconomicUpdate(country: CountryState): CountryState {
    const newGrowthRate = EconomySystem.calculateGrowthRate(country);
    const updatedCountry = {
      ...country,
      growthRate: newGrowthRate,
    };

    return EconomySystem.updateGdp(updatedCountry);
  }

  static getEconomicHealth(country: CountryState): string {
    const gdpGrowth = country.growthRate;
    const debt = country.debtGdpRatio;

    if (gdpGrowth >= 0.05 && debt < 0.6) return "EXCELLENT";
    if (gdpGrowth >= 0.02 && debt < 1.0) return "GOOD";
    if (gdpGrowth >= 0 && debt < 1.5) return "STABLE";
    if (gdpGrowth >= -0.02) return "STRUGGLING";
    return "CRISIS";
  }

  static calculateProcurementCapacity(country: CountryState): number {
    const militaryBudget = EconomySystem.calculateMilitaryBudget(country);
    const maintenanceCost = country.manpower * 10000 + country.airpower * 1000000;
    const availableFunds = militaryBudget - maintenanceCost;
    return Math.max(0, availableFunds);
  }

  static procureManpower(country: CountryState, amount: number): CountryState {
    const costPerSoldier = 50000;
    const totalCost = amount * costPerSoldier;
    const capacity = EconomySystem.calculateProcurementCapacity(country);

    if (totalCost > capacity) {
      throw new Error("Insufficient procurement capacity");
    }

    return {
      ...country,
      manpower: country.manpower + amount,
    };
  }

  static procureAirpower(country: CountryState, amount: number): CountryState {
    const costPerAircraft = 50000000;
    const totalCost = amount * costPerAircraft;
    const capacity = EconomySystem.calculateProcurementCapacity(country);

    if (totalCost > capacity) {
      throw new Error("Insufficient procurement capacity");
    }

    return {
      ...country,
      airpower: country.airpower + amount,
    };
  }
}
