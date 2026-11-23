import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { ceasefireChance, talksAgainTurn } from "../../src/core/systems/diplomacy.js";
import { startWar } from "../../src/core/systems/military.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";
import { playControl, UKR_CONTROL } from "../fixtures/control.js";

/**
 * F-02-3: wild moves have loud consequences (CLAUDE.md invariants). Leo, playing the Hormuz
 * Convoy as the United States, queued "Strike nuclear sites in China" in month 1: China only
 * denounced him and his approval went up. Nuclear use must bring the global embargo, the
 * retaliation risk, war, a collapse of approval and legitimacy at home, and a big moment.
 */

const loader = createDataLoader();
const step = (w: WorldState, orders: Action[] = []) =>
  new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), []).newState;
const get = (w: WorldState, id: string) => w.countries.find((c) => c.id === id)!;

describe("a strike on a nuclear power in peacetime (Leo's month 1)", () => {
  const start = loader.newGame({
    scenarioId: "2026",
    playerCountryId: "USA",
    seed: 4,
    mode: "FLASHPOINT",
    flashpointId: "hormuz-convoy",
  });
  const after = step(start, [
    { type: "MILITARY_AIRSTRIKE", targetCountryId: "CHN", params: { targetType: "NUCLEAR" } },
  ]);
  const usa0 = get(start, "USA");
  const usa = get(after, "USA");
  const report = after.turnReport!;

  it("is answered with war, not a denunciation", () => {
    expect(get(start, "USA").atWarWith).not.toContain("CHN");
    expect(usa.atWarWith).toContain("CHN");
    expect(after.wars.some((w) => w.attackerId === "CHN" && w.defenderId === "USA")).toBe(true);
    expect(after.newspaper.some((n) => /WAR: China attacks United States/.test(n.headline))).toBe(true);
  });

  it("costs approval and legitimacy at home and shocks world tension", () => {
    expect(usa.approval).toBeLessThan(usa0.approval);
    expect(usa.legitimacy).toBeLessThan(usa0.legitimacy);
    expect(after.globalTension).toBeGreaterThan(start.globalTension + 8);
  });

  it("is a big moment, and the order says what it did: no damage to a hardened arsenal, and war", () => {
    expect(report.moments).toContain("ACT OF WAR");
    const o = report.orders.find((x) => x.type === "MILITARY_AIRSTRIKE");
    expect(o?.status).toMatch(/NO_EFFECT|FAILED/);
    expect(o?.reason).toMatch(/declaration of war/);
  });
});

describe("nuclear use", () => {
  function nuked(seed: number) {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed, mode: "TERM" });
    if (!get(w, "USA").atWarWith.includes("IRN")) startWar(w, "USA", "IRN");
    const before = structuredClone(w);
    w = step(w, [{ type: "NUCLEAR_STRIKE", targetCountryId: "IRN" } as Action]);
    return { before, after: w };
  }

  it("brings the global embargo, collapsing relations, approval and legitimacy, and a big moment", () => {
    const { before, after } = nuked(11);
    const usa0 = get(before, "USA");
    const usa = get(after, "USA");
    expect(usa.underGlobalEmbargo).toBe(true);
    expect(usa.approval).toBeLessThanOrEqual(usa0.approval - 15);
    expect(usa.legitimacy).toBeLessThanOrEqual(usa0.legitimacy - 10);
    // Every state turns on the striker, friends included
    expect(get(after, "GBR").relations.USA).toBeLessThan(get(before, "GBR").relations.USA - 40);
    expect(after.globalTension).toBeGreaterThan(before.globalTension + 15);
    expect(after.turnReport?.moments).toContain("NUCLEAR STRIKE");
    expect(after.turnReport?.causes.some((c) => /nuclear weapon/.test(c))).toBe(true);
    expect(after.newspaper[0]?.category).toBe("NUCLEAR");
    const o = after.turnReport?.orders.find((x) => x.type === "NUCLEAR_STRIKE");
    expect(o?.status).toBe("DONE");
  });

  it("striking a nuclear-armed enemy brings retaliation and the end of the world", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 3, mode: "TERM" });
    startWar(w, "USA", "CHN");
    w = step(w, [{ type: "NUCLEAR_STRIKE", targetCountryId: "CHN" } as Action]);
    expect(w.gameOver?.reason).toBe("NUCLEAR_HOLOCAUST");
  });
});

// QA3R-3h: one Propose ceasefire a month ended the Ukraine war in month 3 at a stalemate on all
// three Ukraine control seeds (the chance was rolled again every month with no memory). A side
// that refuses does not talk again for REFUSAL_MEMORY months; after the pause the odds are full.
describe("a ceasefire offer every month does not end a stalemate by repetition (QA3R-3h)", () => {
  const war = (w: WorldState) =>
    w.wars.find((x) => [x.attackerId, x.defenderId].sort().join() === "RUS,UKR");
  it("Ukraine control seeds, an offer to Russia every month: no end before month 6 at a front of 40 to 60", () => {
    let ended = 0;
    for (const code of UKR_CONTROL) {
      const g = playControl(code, "cease");
      for (const m of g.months) {
        const before = war(m.before);
        if (!before || war(m.after)) continue;
        ended += 1;
        const front = before.frontline;
        if (front >= 40 && front <= 60)
          expect(m.before.turn + 1, `${code}: ended in month ${m.before.turn + 1} at ${front}`).toBeGreaterThanOrEqual(6);
      }
    }
    // Still achievable: persistence ends the war within the year on at least one seed
    expect(ended).toBeGreaterThanOrEqual(1);
  });

  it("after a refusal the other side will not talk for two months, then the odds are back", () => {
    const w = playControl("CO-UKR-PRIY1", "none", 1).months[0].before;
    const x = structuredClone(war(w)!);
    const ukr = get(w, "UKR");
    const rus = get(w, "RUS");
    const full = ceasefireChance(x, ukr, rus, 5);
    expect(full).toBeGreaterThan(0);
    x.refusedTurns = [4];
    expect(ceasefireChance(x, ukr, rus, 5)).toBe(0);
    expect(ceasefireChance(x, ukr, rus, 6)).toBe(0);
    expect(ceasefireChance(x, ukr, rus, 7)).toBeCloseTo(full);
    expect(talksAgainTurn(x)).toBe(7);
    // The winner who can dictate terms still takes a peace at once
    const lost = { ...x, frontline: x.attackerId === "RUS" ? 95 : 5 };
    expect(ceasefireChance(lost, ukr, rus, 5)).toBeGreaterThan(0);
  });
});
