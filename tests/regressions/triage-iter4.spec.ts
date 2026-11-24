// Guards for the iteration 4 customer-round fix-now clusters (runs/iter-04/triage.md, F-04-k).
// UI words are checked against the real engine's numbers on the customers' seats; components are
// rendered with react-dom/server on the desk's store (the DR-INT-2 pattern), no browser.
import React, { createElement } from "../../ui/node_modules/react/index.js";
import { renderToStaticMarkup } from "../../ui/node_modules/react-dom/server.node.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAdvice, deskImpact, missionStatus, suggestionImpact } from "../../src/core/advisors.js";
import { politicalCapitalIncome, PC_CAP } from "../../src/core/costs.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import type { Action, WorldState } from "../../src/core/types.js";

const loader = createDataLoader();

/** Visible text of server-rendered markup (tags dropped, entities decoded, spaces folded). */
export const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

function stubBrowser(width = 1920, height = 1080) {
  vi.stubGlobal("window", {
    location: { search: "" },
    innerWidth: width,
    innerHeight: height,
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
}

/** The desk's store on an engine world, with these answers and these orders chosen. */
async function desk(world: WorldState, choices: Record<string, string> = {}, orders: Action[] = []) {
  const store = await import("../../ui/src/store/gameStore.js");
  const advice = buildAdvice(world);
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  store.useGameStore.setState({
    worldState: world as never,
    saveId: "s1",
    pendingDecisions: world.pendingDecisions as never,
    advice: advice as never,
    missionImpact: deskImpact(world) as never,
    orderImpact: suggestionImpact(world, advice.suggestions) as never,
    objectiveStatus: missionStatus(world, advice.suggestions) as never,
    pcIncome: me ? politicalCapitalIncome(world, me) : 2,
    pcCap: PC_CAP,
    decisionChoices: choices,
    reviewed: Object.fromEntries(Object.keys(choices).map((k) => [k, true])),
    skipped: {},
    deskShown: true,
    pendingActions: orders.map((a) => ({ ...a, label: a.type, origin: "player" })) as never,
  });
  // react-dom/server reads the server snapshot (zustand: the store's initial state): render the
  // live state instead, so a component shows the world set above
  (React as unknown as { useSyncExternalStore: unknown }).useSyncExternalStore = (_s: unknown, get: () => unknown) => get();
  return { store, advice };
}

describe("F-04-10: the Finance Minister reads debt as a percent of GDP", () => {
  it("prints each seat's own debt figure and warns only above 100% (RUS and USA)", async () => {
    const { financeBriefing } = await import("../../ui/src/lib/financeBrief.js");
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

describe("F-04-4: the state band names its capital number as what is left", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("F-04-4: Political capital left ◆ n of 6, n the plan's left, with orders and answers chosen", async () => {
    // CO-UKR-RUTH1 month 1 (a customer's seed): a 1-capital order chosen, so now and left differ
    const world = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "UKR",
      seed: 7,
      mode: "FLASHPOINT",
      flashpointId: "ceasefire-or-collapse",
    });
    await desk(world, {}, [{ type: "DOMESTIC_PROPAGANDA" } as Action]);
    const budget = await import("../../ui/src/lib/budget.js");
    const { StateBand } = await import("../../ui/src/components/StateBand.js");
    const o = budget.capitalOutlook();
    expect(o && o.now !== o.left, "the case must show two different numbers").toBe(true);
    const text = textOf(renderToStaticMarkup(createElement(StateBand)));
    expect(text).toContain(`Political capital left ◆ ${o?.left} of 6`);
    expect(text).not.toContain("what orders cost");
  });
});
