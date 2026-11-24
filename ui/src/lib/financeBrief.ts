// The Finance Minister's local briefing (F-04-10). `debtGdpRatio` is a percent of GDP
// (Russia 20, the United States 123), the same unit the engine's scoring and economy use:
// it is printed as is and only debt above 100% of GDP is called a drag on growth.
export interface FinanceFigures {
  gdp: number;
  /** Smoothed annual real growth as a fraction (0.021 = 2.1%), never growthRate. */
  realGrowth: number;
  /** Percent of GDP. */
  debtGdpRatio: number;
  militaryBudgetPercent: number;
}

/** Debt above this share of GDP (percent) is a drag in its own right (advisorBrain agrees). */
export const DEBT_DRAG_PERCENT = 100;

export function debtLine(debtGdpRatio: number): string {
  return `${Math.round(debtGdpRatio)}%`;
}

export function financeBriefing(f: FinanceFigures): { analysis: string; warnings: string[] } {
  const growth = f.realGrowth ?? 0;
  const debt = f.debtGdpRatio || 0;
  const milBudget = Math.round((f.militaryBudgetPercent || 0) * 10) / 10;
  const warnings: string[] = [];
  if (growth < 0) {
    warnings.push(
      `Our economy is contracting at ${(growth * 100).toFixed(1)}% annually. This is unsustainable and will erode our national power.`,
    );
  }
  if (debt > DEBT_DRAG_PERCENT) {
    warnings.push(`National debt has reached ${debtLine(debt)} of GDP. This is hampering economic growth.`);
  }
  const analysis = `Economic report: GDP stands at $${((f.gdp || 0) / 1e12).toFixed(2)} trillion with ${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(1)}% growth. Debt-to-GDP ratio is ${debtLine(debt)}. Military budget consumes ${milBudget}% of GDP.`;
  return { analysis, warnings };
}
