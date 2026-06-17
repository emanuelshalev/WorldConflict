import type { CountryState, WorldState } from "../types.js";

/**
 * Monthly economic update. Growth rates are annual; applied monthly (/12).
 */
export function updateEconomies(world: WorldState): void {
  for (const country of world.countries) {
    if (country.collapsed) continue;

    const warPenalty = country.atWarWith.length * 0.025;
    const instabilityDrag = Math.max(0, (55 - country.stability) / 100) * 0.03;
    const debtDrag = Math.max(0, (country.debtGdpRatio - 90) / 100) * 0.015;
    const embargoDrag = country.underGlobalEmbargo ? 0.03 : 0;
    const militaryDrag = Math.max(0, (country.militaryBudgetPercent - 5) / 100) * 0.2;
    const insurgencyDrag =
      country.insurgencyLevel === "GUERILLA"
        ? 0.02
        : country.insurgencyLevel === "REBELLION"
          ? 0.01
          : 0;

    const effectiveAnnualGrowth =
      country.growthRate -
      warPenalty -
      instabilityDrag -
      debtDrag -
      embargoDrag -
      militaryDrag -
      insurgencyDrag;

    country.gdp = Math.max(1e9, country.gdp * (1 + effectiveAnnualGrowth / 12));

    // Debt drifts up in war / high military spending, down in stable growth
    if (country.atWarWith.length > 0) {
      country.debtGdpRatio += 0.6;
    } else if (effectiveAnnualGrowth > 0.02 && country.debtGdpRatio > 30) {
      country.debtGdpRatio -= 0.1;
    }
    if (country.militaryBudgetPercent > 6) country.debtGdpRatio += 0.2;
  }
}

export function adjustMilitaryBudget(country: CountryState, newPercent: number): void {
  country.militaryBudgetPercent = Math.max(0.5, Math.min(20, newPercent));
}

/**
 * Hostility indicator from the original game: rising neighbor aggression
 * auto-triggers budget increases.
 */
export function autoBudgetResponse(world: WorldState): void {
  for (const country of world.countries) {
    const threatened =
      country.atWarWith.length > 0 ||
      world.countries.some(
        (other) =>
          other.id !== country.id &&
          other.borderDeployments.some((d) => d.targetCountryId === country.id),
      );
    const rivalAtHighMobilization = (country.history.historicalRivals ?? []).some((rid) => {
      const rival = world.countries.find((c) => c.id === rid);
      return rival && rival.mobilizationLevel > 60;
    });
    if ((threatened || rivalAtHighMobilization) && country.militaryBudgetPercent < 8) {
      country.militaryBudgetPercent = Math.min(20, country.militaryBudgetPercent + 0.2);
    } else if (!threatened && !rivalAtHighMobilization && country.atWarWith.length === 0) {
      // Peace dividend drift back down
      if (country.militaryBudgetPercent > 2.5) {
        country.militaryBudgetPercent = Math.max(2, country.militaryBudgetPercent - 0.05);
      }
    }
  }
}
