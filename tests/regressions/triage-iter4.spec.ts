// Guards for the iteration 4 customer-round fix-now clusters (runs/iter-04/triage.md, F-04-k).
import { describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";

describe("F-04-10: the Finance Minister reads debt as a percent of GDP", () => {
  it("prints each seat's own debt figure and warns only above 100% (RUS and USA)", async () => {
    const { financeBriefing } = await import("../../ui/src/lib/financeBrief.js");
    const loader = createDataLoader();
    const world = loader.newGame({ scenarioId: "2026", playerCountryId: "RUS", seed: 1 });
    for (const id of ["RUS", "USA"]) {
      const c = world.countries.find((x) => x.id === id);
      if (!c) throw new Error(id);
      const brief = financeBriefing({
        gdp: c.gdp,
        realGrowth: 0.01,
        debtGdpRatio: c.debtGdpRatio,
        militaryBudgetPercent: c.militaryBudgetPercent,
      });
      expect(brief.analysis).toContain(`Debt-to-GDP ratio is ${Math.round(c.debtGdpRatio)}%.`);
      const debtWarning = brief.warnings.some((w) => w.includes("National debt"));
      expect(debtWarning, `${id} debt ${c.debtGdpRatio}`).toBe(c.debtGdpRatio > 100);
      // the number on the page is never the percent multiplied again
      expect(brief.analysis).not.toContain(`${Math.round(c.debtGdpRatio * 100)}%`);
    }
  });
});
