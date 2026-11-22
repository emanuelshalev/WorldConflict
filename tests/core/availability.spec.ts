import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import {
  MONTH_CODES,
  monthBlock,
  monthStateFor,
  type OrderBlockCode,
  orderAvailability,
  orderKey,
  orderRules,
} from "../../src/core/availability.js";
import { MAX_ORDERS, PC_CAP } from "../../src/core/costs.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { ENGINE_ORDERS, engineOrderFor } from "../../src/core/orders.js";
import { previewAction } from "../../src/core/preview.js";
import { SeededRandom } from "../../src/core/seed.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const engine = new TurnEngine();
const get = (w: WorldState, id: string) => {
  const c = w.countries.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};
const orderOf = (id: string, target?: string): Action => {
  const def = ENGINE_ORDERS.find((o) => o.id === id);
  if (!def) throw new Error(id);
  return {
    type: def.type,
    ...(def.params ? { params: def.params } : {}),
    ...(def.targeted && target ? { targetCountryId: target } : {}),
  };
};
const empty = { pcLeft: 6, ordersUsed: 0, queuedKeys: [], defenseShareUsed: 0 };

describe("Order registry (engine)", () => {
  it("has unique ids and resolves every variant back to itself", () => {
    const ids = ENGINE_ORDERS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of ENGINE_ORDERS) expect(engineOrderFor(def)?.id).toBe(def.id);
    expect(engineOrderFor({ type: "MILITARY_AIRSTRIKE" })?.id).toBe("airstrike-military");
    expect(engineOrderFor({ type: "DOMESTIC_POLICING" })?.id).toBe("policing-soft");
  });

  it("marks war and nuclear use irreversible, and the preview says so", () => {
    const irreversible = ENGINE_ORDERS.filter((o) => o.irreversible).map((o) => o.type);
    expect(irreversible.sort()).toEqual(["DIPLOMACY_DECLARE_WAR", "NUCLEAR_STRIKE"]);
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    expect(previewAction(w, orderOf("declare-war", "VEN")).irreversible).toBe(true);
    expect(previewAction(w, orderOf("court", "VEN")).irreversible).toBe(false);
  });
});

describe("Availability: rule layer", () => {
  it("gives every blocked preview a code, with the same reason text", () => {
    let blocked = 0;
    const codes = new Set<OrderBlockCode>();
    for (const [player, mode] of [
      ["USA", "TERM"],
      ["IRN", "TERM"],
      ["UKR", "LEGACY"],
      ["ISR", "TERM"],
      ["PAK", "LEGACY"],
    ] as const) {
      const w = loader.newGame({ scenarioId: "2026", playerCountryId: player, seed: 3, mode });
      const targets = [undefined, ...w.countries.map((c) => c.id)];
      for (const def of ENGINE_ORDERS)
        for (const t of def.targeted ? targets : [undefined]) {
          const action = orderOf(def.id, t);
          const p = previewAction(w, action);
          if (!p.blocked) {
            expect(p.block).toBeNull();
            continue;
          }
          blocked++;
          expect(p.block?.code, `${def.id} -> ${t}: ${p.blocked}`).toBeTruthy();
          expect(p.block?.reason).toBe(p.blocked);
          expect(p.blocked).not.toMatch(/\u2014/);
          if (p.block) codes.add(p.block.code);
        }
    }
    expect(blocked).toBeGreaterThan(50);
    // The common refusals all show up across these five seats
    for (const c of ["NEEDS_TARGET", "SELF_TARGET", "AT_WAR", "NOT_AT_WAR", "PACT_REFUSED"] as const)
      expect(codes.has(c), c).toBe(true);
  });

  it("explains a nuclear strike outside wartime with the requirement", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    get(w, "USA").atWarWith = get(w, "USA").atWarWith.filter((id) => id !== "IND");
    const b = orderRules(w, orderOf("nuclear-strike", "IND"));
    expect(b?.code).toBe("NOT_AT_WAR");
    expect(b?.reason).toBe("Only in wartime. You are not at war with India.");
  });

  it("asks for a target first, before any other reason", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    const a = orderAvailability(w, orderOf("declare-war"), { ...empty, pcLeft: 0 });
    expect(a.state).toBe("invalid");
    expect(a.block?.code).toBe("NEEDS_TARGET");
    expect(a.block?.reason).toBe("Pick a country first.");
    expect(a.block?.points).toBe("target");
  });

  it("states the protection requirement without leaking the hidden number", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    const chn = get(w, "CHN");
    chn.stability = 71.37;
    chn.insurgencyLevel = "NONE";
    const b = orderRules(w, orderOf("assassinate", "CHN"));
    expect(b?.code).toBe("TOO_PROTECTED");
    expect(b?.reason).not.toMatch(/71/);
    expect(b?.alt?.type).toBe("INTEL_DESTABILIZE");
    const coup = orderRules(w, orderOf("coup", "CHN"));
    expect(coup?.code).toBe("TOO_STABLE");
    expect(coup?.alt?.type).toBe("INTEL_SUPPORT_REBELS");
  });

  it("offers a ceasefire instead of courting an enemy", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 1, mode: "TERM" });
    const b = orderRules(w, orderOf("court", "RUS"));
    expect(b?.code).toBe("AT_WAR");
    expect(b?.alt?.type).toBe("DIPLOMACY_PROPOSE_CEASEFIRE");
    expect(orderRules(w, orderOf("declare-war", "RUS"))?.code).toBe("ALREADY_AT_WAR");
  });
});

describe("Availability: month layer", () => {
  it("shows the capital gap and the real refill before any tap", () => {
    const term = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    term.politicalCapital = 1;
    const a = orderAvailability(term, orderOf("declare-war", "IND"), monthStateFor(term, []));
    expect(a.state).toBe("unaffordable");
    expect(a.block?.code).toBe("NO_CAPITAL");
    expect(a.block?.reason).toBe("Needs ◆ 2, you have ◆ 1.");
    expect(a.block?.fix).toContain("+2 next month");
    expect(a.block?.points).toBe("capital");
    expect(a.block?.need).toEqual({ have: 1, need: 2, refill: 2 });

    const fp = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "UKR",
      seed: 1,
      mode: "FLASHPOINT",
      flashpointId: "ceasefire-or-collapse",
    });
    fp.politicalCapital = 1;
    fp.pendingDecisions = [];
    fp.agenda = [];
    const b = monthBlock(fp, orderOf("offer-pact", "POL"), monthStateFor(fp, []));
    expect(b?.fix).toContain("+3 next month");
  });

  it("offers to remove an order that frees enough capital", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    w.politicalCapital = 3;
    w.pendingDecisions = [];
    w.agenda = [];
    const month = monthStateFor(w, [orderOf("sabotage", "IRN"), orderOf("spy", "CHN")]);
    expect(month.pcLeft).toBe(0);
    const b = monthBlock(w, orderOf("court", "IND"), month);
    expect(b?.fix).toBe("Remove an order (frees ◆ 1), or wait: +2 next month");
  });

  it("teaches the cap when the bank is full", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    w.politicalCapital = PC_CAP;
    const b = monthBlock(w, orderOf("assassinate", "IRN"), { ...empty, pcLeft: 1 });
    expect(b?.fix).toContain(`can't save more than ◆ ${PC_CAP}`);
  });

  it("marks a repeat as queued and a seventh order as over the limit", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 1, mode: "TERM" });
    const court = orderOf("court", "IND");
    const dup = orderAvailability(w, court, { ...empty, queuedKeys: [orderKey(court)] });
    expect(dup.state).toBe("queued");
    expect(dup.block?.reason).toBe("In this month.");
    const full = orderAvailability(w, orderOf("denounce", "IRN"), { ...empty, ordersUsed: MAX_ORDERS });
    expect(full.block?.code).toBe("ORDER_LIMIT");
    expect(full.block?.reason).toBe("All 6 orders this month are used.");
    expect(full.block?.points).toBe("orders");
  });

  it("puts the permanent reason ahead of the budget", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 1, mode: "TERM" });
    const a = orderAvailability(w, orderOf("declare-war", "RUS"), { ...empty, pcLeft: 0, ordersUsed: 6 });
    expect(a.block?.code).toBe("ALREADY_AT_WAR");
  });

  it("refuses a procurement beyond the defense budget", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "PAK", seed: 1, mode: "TERM" });
    const buy: Action = { type: "MILITARY_PROCURE", value: 40_000 };
    const b = monthBlock(w, buy, monthStateFor(w, []));
    expect(b?.code).toBe("NO_DEFENSE_BUDGET");
    expect(b?.points).toBe("defense");
  });
});

/**
 * The agreement test: over 24-turn games, an order that both layers pass when
 * it is queued is never refused at Execute for a predictable reason. The only
 * refusals left are chance failures (no code).
 */
describe("Availability: preview and Execute agree", () => {
  const seats: Array<{ player: string; seed: number; mode: "TERM" | "LEGACY" }> = [
    { player: "USA", seed: 11, mode: "LEGACY" },
    { player: "IRN", seed: 12, mode: "TERM" },
    { player: "UKR", seed: 13, mode: "TERM" },
    { player: "PAK", seed: 14, mode: "LEGACY" },
    { player: "ISR", seed: 15, mode: "TERM" },
    { player: "RUS", seed: 16, mode: "LEGACY" },
  ];

  /** Random player orders that pass both layers, one per target, war declared last. */
  function pickOrders(w: WorldState, rng: SeededRandom): Action[] {
    const targets = w.countries.filter((c) => c.id !== w.playerCountryId).map((c) => c.id);
    const queued: Action[] = [];
    const used = new Set<string>();
    let pacts = 0;
    for (let tries = 0; tries < 60 && queued.length < MAX_ORDERS; tries++) {
      const def = ENGINE_ORDERS[rng.nextInt(0, ENGINE_ORDERS.length)];
      const t = def.targeted ? targets[rng.nextInt(0, targets.length)] : undefined;
      // One order per target keeps orders from changing each other's rules mid-month
      if (t && used.has(t)) continue;
      // A second pact could hit the treaty cap once the first is signed
      if (def.type === "DIPLOMACY_PROPOSE_ALLIANCE" && pacts > 0) continue;
      const action = orderOf(def.id, t);
      const a = orderAvailability(w, action, monthStateFor(w, queued));
      if (a.state !== "available") continue;
      queued.push(action);
      if (t) used.add(t);
      if (def.type === "DIPLOMACY_PROPOSE_ALLIANCE") pacts++;
    }
    // A war pulls in the target's allies: declare it after the other orders
    return [
      ...queued.filter((a) => a.type !== "DIPLOMACY_DECLARE_WAR"),
      ...queued.filter((a) => a.type === "DIPLOMACY_DECLARE_WAR"),
    ];
  }

  it("never rejects an available order for a predictable reason over 24 turns", () => {
    const problems: string[] = [];
    let given = 0;
    for (const seat of seats) {
      let w = loader.newGame({
        scenarioId: "2026",
        playerCountryId: seat.player,
        seed: seat.seed,
        mode: seat.mode,
      });
      const rng = new SeededRandom(seat.seed * 7919);
      for (let t = 0; t < 24 && !w.gameOver; t++) {
        const orders = pickOrders(w, rng);
        given += orders.length;
        const next = engine.executeTurn(w, orders, generateDeterministicIntents(w)).newState;
        for (const o of next.turnReport?.orders ?? [])
          if (!o.ok && o.code)
            problems.push(`${seat.player} turn ${w.turn}: ${o.label} [${o.code}] ${o.detail}`);
        w = next;
      }
    }
    expect(given).toBeGreaterThan(300);
    expect(problems).toEqual([]);
  }, 60_000);

  it("reports a code for every predictable refusal at Execute", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 1, mode: "TERM" });
    w.politicalCapital = 1;
    const orders: Action[] = [
      orderOf("court", "RUS"), // AT_WAR
      orderOf("denounce", "RUS"),
      orderOf("denounce", "RUS"), // DUPLICATE
      orderOf("assassinate", "POL"), // rule first: Poland is stable
      orderOf("sabotage", "BLR"), // NO_CAPITAL (◆ 2, 1 left)
    ];
    const report = engine.executeTurn(w, orders, generateDeterministicIntents(w)).newState.turnReport;
    const codes = (report?.orders ?? []).map((o) => o.code ?? (o.ok ? "ok" : "chance"));
    expect(codes).toEqual(["AT_WAR", "ok", "DUPLICATE", "TOO_PROTECTED", "NO_CAPITAL"]);
    for (const code of codes.filter((c) => c !== "ok"))
      expect(MONTH_CODES.has(code as OrderBlockCode) || code !== "chance").toBe(true);
  });
});
