import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { previewAction } from "../../src/core/preview.js";
import { SeededRandom } from "../../src/core/seed.js";
import { proposeAlliance } from "../../src/core/systems/diplomacy.js";
import { runGovernmentDynamics } from "../../src/core/systems/government.js";
import { buildPlayerView } from "../../src/core/systems/intelligence.js";
import { startWar } from "../../src/core/systems/military.js";
import { withArticle } from "../../src/core/text.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const engine = new TurnEngine();
const get = (w: WorldState, id: string) => {
  const c = w.countries.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};
const run = (w: WorldState, turns: number) => {
  let s = w;
  for (let t = 0; t < turns && !s.gameOver; t++) s = engine.executeTurn(s, [], generateDeterministicIntents(s)).newState;
  return s;
};

describe("Wars between allies (persona round 3)", () => {
  it("sends a co-belligerent home when the war it joined ends", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "PHL", seed: 2, mode: "TERM" });
    const war = startWar(w, "PHL", "IRN");
    if (!war) throw new Error("fixture");
    war.alliedWith = "USA";
    get(w, "PHL").atWarWith.push("IRN");
    get(w, "IRN").atWarWith.push("PHL");
    // The principal makes peace
    w.wars = w.wars.filter((x) => !(x.attackerId === "USA" && x.defenderId === "IRN"));
    get(w, "USA").atWarWith = get(w, "USA").atWarWith.filter((id) => id !== "IRN");
    get(w, "IRN").atWarWith = get(w, "IRN").atWarWith.filter((id) => id !== "USA");
    const next = engine.executeTurn(w, [], []).newState;
    expect(get(next, "PHL").atWarWith).not.toContain("IRN");
  });
});

describe("Realism (persona round 3)", () => {
  it("does not re-elect a term-limited president", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 1, mode: "LEGACY" });
    const fra = get(w, "FRA");
    const macron = fra.leader.name;
    fra.approval = 90;
    fra.politicalSystem.nextElectionTurn = w.turn;
    runGovernmentDynamics(w, new SeededRandom(3));
    expect(fra.leader.name).not.toBe(macron);
  });

  it("rarely signs defence pacts, never with a country at war or with Taiwan", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 1, mode: "TERM" });
    const can = get(w, "CAN");
    const ukr = get(w, "UKR");
    ukr.relations.CAN = 95;
    expect(proposeAlliance(can, ukr, new SeededRandom(1)).accepted).toBe(false);
    const twn = get(w, "TWN");
    twn.relations.JPN = 95;
    expect(proposeAlliance(get(w, "JPN"), twn, new SeededRandom(1)).accepted).toBe(false);
    const s = run(w, 12);
    const before = w.countries.reduce((n, c) => n + c.alliances.length, 0) / 2;
    const after = s.countries.reduce((n, c) => n + c.alliances.length, 0) / 2;
    expect(after - before).toBeLessThanOrEqual(6);
  });

  it("keeps intelligence percentage estimates within 0-100", () => {
    const w = run(loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" }), 3);
    for (const v of buildPlayerView(w)) {
      if (!v.stability) continue;
      expect(v.stability.high).toBeLessThanOrEqual(100);
    }
  });

  it("puts 'the' before the United States and the Philippines", () => {
    expect(withArticle("Philippines")).toBe("the Philippines");
    expect(withArticle("Iran")).toBe("Iran");
  });

  it("skips an authored crisis whose war has already ended", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 1, mode: "FLASHPOINT", flashpointId: "ceasefire-or-collapse" });
    const blackout = w.director.scheduled.find((s) => s.turn === 2);
    expect(blackout?.requiresWar).toEqual(["RUS", "UKR"]);
    w.wars = w.wars.filter((x) => !([x.attackerId, x.defenderId].includes("RUS") && [x.attackerId, x.defenderId].includes("UKR")));
    get(w, "UKR").atWarWith = get(w, "UKR").atWarWith.filter((id) => id !== "RUS");
    get(w, "RUS").atWarWith = get(w, "RUS").atWarWith.filter((id) => id !== "UKR");
    const s = run(w, 3);
    expect(s.timeline.concat().some((t) => t.description === blackout?.headline)).toBe(false);
    expect(s.pendingDecisions.some((d) => d.title === blackout?.decision?.title)).toBe(false);
  });
});

describe("Honest numbers (persona round 3)", () => {
  it("reports real growth that matches what GDP actually did", () => {
    let s = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 1, mode: "TERM" });
    const g0 = get(s, "UKR").gdp;
    s = run(s, 12);
    const actual = get(s, "UKR").gdp / g0 - 1;
    const shown = get(s, "UKR").realGrowth ?? 0;
    expect(Math.sign(shown)).toBe(Math.sign(actual));
  });

  it("previews a repeated national address at its diminished strength", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 1, mode: "TERM" });
    w.director.propagandaTurns = [w.turn - 1, w.turn - 2];
    const p = previewAction(w, { type: "DOMESTIC_PROPAGANDA" });
    expect(p.effects.find((e) => e.metric === "Approval")?.delta).toBe("+1.4");
  });

  it("scores the end of the world at almost nothing", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "RUS", seed: 1, mode: "LEGACY" });
    w.timeline.push({ turn: 1, date: w.date, category: "NUCLEAR", description: "GLOBAL NUCLEAR HOLOCAUST" });
    const s = engine.executeTurn(w, [], []).newState;
    expect(s.gameOver?.reason).toBe("NUCLEAR_HOLOCAUST");
    expect(s.score.total).toBeLessThanOrEqual(5);
  });
});

describe("Collapse has consequences (persona round 3)", () => {
  it("warns, then can remove, a democratic leader at zero legitimacy", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "BRA", seed: 1, mode: "TERM" });
    const bra = get(w, "BRA");
    let warned = false;
    let removed = false;
    for (let seed = 0; seed < 60 && !removed; seed++) {
      const s = structuredClone(w);
      const b = get(s, "BRA");
      b.legitimacy = 2;
      b.stability = 40;
      b.approval = 5;
      s.director.coupWarnedTurn = seed % 2 ? s.turn - 1 : null;
      s.director.coupShieldUntil = s.turn + 10; // a shield no longer saves a leader nobody believes in
      const res = runGovernmentDynamics(s, new SeededRandom(seed));
      if (s.pendingDecisions.some((d) => d.templateId === "ouster_vote")) warned = true;
      if (res.changes.some((c) => c.isPlayerDeposed)) removed = true;
    }
    expect(bra.regimeType).toBe("DEMOCRACY");
    expect(warned).toBe(true);
    expect(removed).toBe(true);
  });
});
