import { describe, expect, it } from "vitest";
import { monthBlock as engineMonthBlock, needsTarget as engineNeedsTarget, orderKey } from "../src/core/availability.js";
import { actionCostM, MAX_ORDERS as ENGINE_MAX, PC_CAP as ENGINE_CAP, politicalCapitalIncome } from "../src/core/costs.js";
import { createDataLoader } from "../src/core/data-loader.js";
import { ENGINE_ORDERS } from "../src/core/orders.js";
import { monthlyDefenseBudgetM } from "../src/core/systems/military.js";
import type { Action, WorldState } from "../src/core/types.js";
import {
  availabilityOf,
  defenseCostM,
  MAX_ORDERS,
  type MenuEntry,
  type MonthView,
  monthBlock,
  needsTarget,
  orderKeyOf,
  PC_CAP,
} from "../ui/src/lib/availability.js";

/**
 * The client month layer (ui/src/lib/availability.ts) mirrors the engine's monthBlock() word for
 * word (design-orders.md §11: "the same template table mirrored ... covered by a snapshot test
 * against the engine strings"). Same inputs, same code, reason, fix and point target.
 */
const loader = createDataLoader();
const world = (): WorldState => loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
const orderOf = (id: string, target?: string): Action => {
  const def = ENGINE_ORDERS.find((o) => o.id === id);
  if (!def) throw new Error(id);
  return { type: def.type, ...(def.params ? { params: def.params } : {}), ...(def.targeted && target ? { targetCountryId: target } : {}) };
};

/** Both views of the same unsent month. */
function months(w: WorldState, queued: Action[], pcLeft: number) {
  const me = w.countries.find((c) => c.id === w.playerCountryId);
  if (!me) throw new Error("no player");
  const budgetM = monthlyDefenseBudgetM(me);
  const costs = queued.map((a) => (a.type === "DOMESTIC_REFORM" || a.type === "INTEL_SABOTAGE" ? 2 : a.type === "DIPLOMACY_DENOUNCE" ? 0 : 1));
  const usedM = queued.reduce((s, a) => s + actionCostM(a, me), 0);
  const engine = { pcLeft, ordersUsed: queued.length, queuedKeys: queued.map(orderKey), defenseShareUsed: usedM / budgetM, defenseUsedM: usedM, queuedCosts: costs };
  const client: MonthView = {
    pcLeft,
    bank: w.politicalCapital,
    pcIncome: politicalCapitalIncome(w, me),
    pcCap: PC_CAP,
    ordersUsed: queued.length,
    queuedKeys: queued.map(orderKeyOf),
    queuedCosts: costs,
    queuedLabels: queued.map((a) => a.type),
    queuedStaff: queued.map(() => false),
    defenseUsedM: usedM,
    budgetM,
    gameOver: false,
  };
  return { engine, client };
}

const pick = (b: { code: string; reason: string; fix: string | null; points: string | null } | null) => (b ? { code: b.code, reason: b.reason, fix: b.fix, points: b.points } : null);

describe("client month layer mirrors the engine", () => {
  it("shares the constants, order keys, target rule and defense costs", () => {
    expect(MAX_ORDERS).toBe(ENGINE_MAX);
    expect(PC_CAP).toBe(ENGINE_CAP);
    const w = world();
    const me = w.countries.find((c) => c.id === "USA");
    if (!me) throw new Error("USA");
    for (const def of ENGINE_ORDERS) {
      const a = orderOf(def.id, "IRN");
      expect(needsTarget(def.type)).toBe(engineNeedsTarget(def.type));
      expect(orderKeyOf(a)).toBe(orderKey(a));
      expect(defenseCostM(a, monthlyDefenseBudgetM(me))).toBe(actionCostM(a, me));
    }
  });

  const cases: Array<[string, Action[], number, string, string?]> = [
    ["available", [], 3, "spy", "IRN"],
    ["capital gap with an order that frees it", [orderOf("court", "CHN"), orderOf("reform")], 1, "declare-war", "VEN"],
    ["capital gap, nothing frees it", [orderOf("court", "CHN")], 0, "assassinate", "IRN"],
    ["duplicate", [orderOf("spy", "IRN")], 2, "spy", "IRN"],
    ["order limit", ["court:CHN", "court:IRN", "court:VEN", "spy:CHN", "spy:VEN", "denounce:IRN"].map((k) => orderOf(k.split(":")[0], k.split(":")[1])), 6, "spy", "IRN"],
    ["defense budget", [orderOf("procure"), orderOf("procure"), orderOf("mobilize"), orderOf("fund-nuclear")], 6, "procure"],
  ];
  for (const [name, queued, pcLeft, id, target] of cases) {
    it(`same block: ${name}`, () => {
      const w = world();
      const { engine, client } = months(w, queued, pcLeft);
      const a = orderOf(id, target);
      expect(pick(monthBlock(a, client))).toEqual(pick(engineMonthBlock(w, a, engine)));
    });
  }

  it("teaches the cap when the bank is full, like the engine", () => {
    const w = world();
    w.politicalCapital = ENGINE_CAP;
    const { engine, client } = months(w, [], 1);
    const a = orderOf("assassinate", "IRN");
    expect(pick(monthBlock(a, client))).toEqual(pick(engineMonthBlock(w, a, engine)));
    expect(monthBlock(a, client)?.fix).toContain("Political capital is full");
  });
});

describe("availabilityOf precedence", () => {
  const w = world();
  const { client } = months(w, [orderOf("spy", "IRN")], 0);
  const entry = (block: MenuEntry["block"]): MenuEntry => ({
    id: "x", type: "INTEL_COUP", params: null, label: "", targeted: true, costPC: 3, costM: 0, budgetM: 1,
    defenseShare: 0, chance: null, block, irreversible: false, missionWarning: null, summary: "", effects: [], risks: [],
  });

  it("asks for a target before anything else", () => {
    expect(availabilityOf({ type: "INTEL_COUP", targeted: true }, client).block?.code).toBe("NEEDS_TARGET");
  });
  it("shows the permanent rule ahead of the budget", () => {
    const rule = { code: "TOO_STABLE" as const, reason: "too stable", fix: null, points: null };
    const r = availabilityOf({ type: "INTEL_COUP", targetCountryId: "IRN", targeted: true }, client, entry(rule));
    expect(r.state).toBe("invalid");
    expect(r.block?.code).toBe("TOO_STABLE");
  });
  it("then the budget, with the tray slot that frees it", () => {
    const r = availabilityOf({ type: "INTEL_COUP", targetCountryId: "IRN", targeted: true }, { ...client, pcLeft: 2, queuedCosts: [1] }, entry(null));
    expect(r.state).toBe("unaffordable");
    expect(r.block?.slots).toEqual([0]);
  });
  it("draws a queued order as queued, never as an error", () => {
    expect(availabilityOf({ type: "INTEL_GATHER", targetCountryId: "IRN", targeted: true }, client).state).toBe("queued");
  });
});
