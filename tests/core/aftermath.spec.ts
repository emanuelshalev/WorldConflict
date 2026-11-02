import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { startWar } from "../../src/core/systems/military.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const step = (w: WorldState, orders: Action[] = [], choices: Array<{ decisionId: string; optionId: string }> = []) =>
  new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), choices).newState;
const get = (w: WorldState, id: string) => w.countries.find((c) => c.id === id)!;

function struck(): { before: WorldState; after: WorldState } {
  let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 11, mode: "TERM" });
  if (!get(w, "USA").atWarWith.includes("IRN")) startWar(w, "USA", "IRN");
  const before = structuredClone(w);
  w = step(w, [{ type: "NUCLEAR_STRIKE", targetCountryId: "IRN" } as Action]);
  return { before, after: w };
}

describe("the world answers a nuclear strike", () => {
  it("leaves fallout over the target and its neighbours, and shocks every market", () => {
    const { before, after } = struck();
    expect(get(after, "IRN").fallout).toBeGreaterThan(80);
    expect(get(after, "IRQ").fallout).toBeGreaterThan(0);
    expect(get(after, "DEU").gdp).toBeLessThan(get(before, "DEU").gdp * 1.002);
    expect(after.director.shocks.some((s) => s.kind === "NUCLEAR_STRIKE" && s.target === "IRN")).toBe(true);
  });

  it("puts the day after on the leader's calendar", () => {
    const { after } = struck();
    const emergency = after.agenda.filter((m) => m.urgency === "URGENT");
    expect(emergency.length).toBeGreaterThanOrEqual(2);
    expect(emergency.some((m) => /day after/.test(m.title))).toBe(true);
    expect(emergency.some((m) => m.kind === "CALL" && /Security Council/.test(m.situation))).toBe(true);
  });

  it("keeps hurting for months, with aftermath news, and the target's economy shrinks", () => {
    let { after: w } = struck();
    const gdp0 = get(w, "IRN").gdp;
    const titles: string[] = [];
    for (let i = 0; i < 5; i++) {
      w = step(w);
      titles.push(...w.newspaper.map((n) => n.headline));
    }
    expect(get(w, "IRN").gdp).toBeLessThan(gdp0 * 0.95);
    expect(get(w, "IRN").realGrowth ?? 0).toBeLessThan(0);
    expect(get(w, "IRN").fallout).toBeGreaterThan(40);
    expect(titles.some((t) => /hospitals|Refugees|Crops|free fall/i.test(t))).toBe(true);
  });

  it("ends the war when the leader accepts the world's ceasefire", () => {
    const { after } = struck();
    const call = after.agenda.find((m) => m.kind === "CALL" && m.urgency === "URGENT");
    if (!call) throw new Error("no emergency call");
    const next = step(after, [], [{ decisionId: call.id, optionId: "ceasefire" }]);
    expect(get(next, "USA").atWarWith).not.toContain("IRN");
  });
});
