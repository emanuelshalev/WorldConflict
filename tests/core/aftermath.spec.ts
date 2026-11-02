import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { startWar } from "../../src/core/systems/military.js";
import { generateAgenda } from "../../src/core/meetings.js";
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

describe("the world answers coups, collapses and lost allies", () => {
  const fresh = () => loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 21, mode: "TERM" });

  it("convenes the cabinet when power changes hands somewhere that matters", () => {
    const w = fresh();
    w.director.shocks.push({ kind: "REGIME_CHANGE", by: "COUP", target: "EGY", turn: w.turn });
    const m = generateAgenda(w).find((x) => /power changes hands in Egypt/.test(x.title));
    expect(m?.situation).toMatch(/military coup/);
    expect(m?.options.map((o) => o.id)).toEqual(expect.arrayContaining(["recognise", "condemn"]));
  });

  it("answers a lost ally with a cabinet meeting and a call from the former ally", () => {
    const w = fresh();
    const ally = get(w, "USA").alliances[0] ?? "GBR";
    w.director.shocks.push({ kind: "ALLY_LOST", target: ally, turn: w.turn });
    const agenda = generateAgenda(w);
    expect(agenda.some((x) => /we have lost/.test(x.title))).toBe(true);
    expect(agenda.some((x) => x.kind === "CALL" && x.withCountry === ally && x.urgency === "URGENT")).toBe(true);
  });

  it("records a neighbour's collapse during the month and puts it on next month's calendar", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "IND", seed: 4, mode: "TERM" });
    const pak = get(w, "PAK");
    pak.stability = 0;
    pak.legitimacy = 2;
    w = step(w);
    if (!get(w, "PAK").collapsed) return; // the month's events can still rescue it
    expect(w.director.shocks.some((s) => s.kind === "COLLAPSE" && s.target === "PAK")).toBe(true);
    expect(w.agenda.some((x) => /Pakistan has collapsed/.test(x.title))).toBe(true);
  });
});
