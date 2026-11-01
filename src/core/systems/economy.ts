import type { CountryState, WorldState } from "../types.js";

/**
 * Monthly economic update. Growth rates are annual; applied monthly (/12).
 */
export function updateEconomies(world: WorldState): void {
  for (const country of world.countries) {
    if (country.collapsed) continue;

    // Shocks (oil spikes, crises, sanctions answers) fade: growth relaxes back
    // toward the country's structural trend, 10%/month (half-life ≈ 7 months)
    const trend = country.trendGrowth ?? country.economyProfile?.growthRate ?? country.growthRate;
    country.growthRate += (trend - country.growthRate) * 0.1;

    const effectiveAnnualGrowth = effectiveGrowth(country);

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

/**
 * Annual growth after drags. Drags are measured against each country's
 * structural baseline (Japan's debt is priced into its trend growth), so a
 * peaceful, stable country grows at roughly its trend.
 */
export function effectiveGrowth(country: CountryState): number {
  const warPenalty = country.atWarWith.length * 0.025;
  const instabilityDrag = Math.max(0, (55 - country.stability) / 100) * 0.03;
  const debtBaseline = Math.max(90, country.economyProfile?.debtGdpRatio ?? 90);
  const debtDrag = Math.max(0, (country.debtGdpRatio - debtBaseline) / 100) * 0.015;
  const embargoDrag = country.underGlobalEmbargo ? 0.03 : 0;
  const militaryDrag = Math.max(0, (country.militaryBudgetPercent - 5) / 100) * 0.12;
  const insurgencyDrag =
    country.insurgencyLevel === "GUERILLA"
      ? 0.02
      : country.insurgencyLevel === "REBELLION"
        ? 0.01
        : 0;
  return (
    country.growthRate -
    warPenalty -
    instabilityDrag -
    debtDrag -
    embargoDrag -
    militaryDrag -
    insurgencyDrag
  );
}

/**
 * How the public reads the economy: +1 boom, -1 bust, 0 normal. Judged
 * against the country's own trend — a boom for Germany is normal for Taiwan.
 */
export function growthMood(country: CountryState): -1 | 0 | 1 {
  const expected = country.trendGrowth ?? country.economyProfile?.growthRate ?? 0.02;
  if (country.growthRate > Math.max(0.02, expected + 0.005)) return 1;
  if (country.growthRate < Math.min(0, expected - 0.015)) return -1;
  return 0;
}

export function adjustMilitaryBudget(country: CountryState, newPercent: number): void {
  country.militaryBudgetPercent = Math.max(0.5, Math.min(40, newPercent));
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
      country.militaryBudgetPercent = Math.min(40, country.militaryBudgetPercent + 0.2);
    } else if (!threatened && !rivalAtHighMobilization && country.atWarWith.length === 0) {
      // Peace dividend drift back down
      if (country.militaryBudgetPercent > 2.5) {
        country.militaryBudgetPercent = Math.max(2, country.militaryBudgetPercent - 0.05);
      }
    }
  }
}
