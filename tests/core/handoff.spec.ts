import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { previewAction } from "../../src/core/preview.js";
import { classifyLeadership } from "../../src/core/scoring.js";
import { SeededRandom } from "../../src/core/seed.js";
import { isConsolidatedDemocracy } from "../../src/core/systems/government.js";
import { endWar } from "../../src/core/systems/military.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const engine = new TurnEngine();
const get = (w: WorldState, id: string) => {
  const c = w.countries.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

describe("Turn report feedback", () => {
  it("reports the relation change when courting", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "EGY", seed: 4, mode: "TERM" });
    const next = engine.executeTurn(
      w,
      [{ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: "ETH" }],
      generateDeterministicIntents(w),
    ).newState;
    const order = next.turnReport?.orders.find((o) => o.label.startsWith("Court"));
    expect(order?.ok).toBe(true);
    expect(order?.detail).toMatch(/^Relations -?\d+ → -?\d+/);
    expect(get(next, "EGY")).toBeDefined();
  });
});

describe("End-screen verdict", () => {
  const play = (w: WorldState, turns: number, orders: (w: WorldState) => Parameters<TurnEngine["executeTurn"]>[1] = () => []) => {
    let s = w;
    for (let t = 0; t < turns && !s.gameOver; t++)
      s = engine.executeTurn(s, orders(s), generateDeterministicIntents(s)).newState;
    return s;
  };

  it("names a war of choice, keeps 'Stay in power' and fails the grade", () => {
    const w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "RUS",
      seed: 11,
      mode: "FLASHPOINT",
      flashpointId: "ceasefire-or-collapse",
    });
    const end = play(w, 6, (s) =>
      s.turn === 1 ? [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "POL" }] : [],
    );
    expect(end.gameOver?.reason).toBe("OBJECTIVE_FAILED");
    const verdict = classifyLeadership(end);
    expect(verdict.classification).toBe("Warmonger");
    expect(["D", "F"]).toContain(verdict.grade);
    expect(verdict.grade).toBe("F"); // failed in month 2 of 12
    expect(end.outcome?.conditions.find((c) => c.label === "Stay in power")?.met).toBe(true);
  });

  it("never grades a won session below C", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 2, mode: "TERM" });
    const won = {
      ...w,
      turn: w.maxTurns,
      gameOver: { reason: "TERM_COMPLETED" as const, description: "", turn: w.maxTurns - 1 },
      outcome: { victory: true, stars: 1, conditions: [] },
      score: { ...w.score, total: 40 },
    };
    expect(["S", "A", "B", "C"]).toContain(classifyLeadership(won).grade);
    expect(classifyLeadership({ ...won, outcome: { ...won.outcome, stars: 3 }, score: { ...w.score, total: Math.ceil((w.objective?.par ?? 100) * 1.3) } }).grade).toBe("S");
  });

  it("calls a passive player a caretaker and a busy one something else", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 2, mode: "TERM" });
    const idle = play(w, 8);
    expect(classifyLeadership(idle).classification).not.toBe("Warmonger");
    const busy = play(w, 8, () => [{ type: "DOMESTIC_REFORM" }]);
    expect(busy.director.record.DOMESTIC_REFORM).toBeGreaterThan(0);
    expect(classifyLeadership(busy).classification).not.toBe("Cautious Caretaker");
  });
});

describe("Player leader", () => {
  it("plays as the era's real leader by default, with a backstory that fits the flashpoint", () => {
    const w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "IRN",
      seed: 3,
      mode: "FLASHPOINT",
      flashpointId: "hormuz-convoy",
    });
    expect(get(w, "IRN").leader.name).toBe("Mojtaba Khamenei");
    expect(w.playerBackstory).toContain("Mojtaba Khamenei");
    expect(w.playerBackstory).toContain(w.objective?.briefing ?? "?");
    expect(w.playerBackstory).not.toMatch(/Assembly of Experts has elevated you/);
  });

  it("keeps a custom name when the player gives one", () => {
    const w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "UKR",
      seed: 3,
      mode: "TERM",
      leaderName: "Olena Test",
    });
    expect(get(w, "UKR").leader.name).toBe("Olena Test");
    const real = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 3, mode: "TERM" });
    expect(get(real, "UKR").leader.name).toBe("Volodymyr Zelensky");
    expect(real.playerBackstory).toMatch(/^You are .*Volodymyr Zelensky of Ukraine/);
  });
});

describe("Mission warnings in previews", () => {
  it("warns that declaring war on a protected country ends the mission", () => {
    const w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "RUS",
      seed: 1,
      mode: "FLASHPOINT",
      flashpointId: "ceasefire-or-collapse",
    });
    const war = previewAction(w, { type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "POL" });
    expect(war.missionWarning).toMatch(/^This ends your mission/);
    const court = previewAction(w, { type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: "POL" });
    expect(court.missionWarning).toBeNull();
  });

  it("does not warn outside objectives", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 1, mode: "LEGACY" });
    expect(previewAction(w, { type: "DIPLOMACY_DENOUNCE", targetCountryId: "RUS" }).missionWarning).toBeNull();
  });
});

describe("Regime realism", () => {
  it("does not let a revolution topple a consolidated democracy on unrest alone", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 8, mode: "LEGACY" });
    const usa = get(w, "USA");
    expect(isConsolidatedDemocracy(usa)).toBe(true);
    let toppled = 0;
    for (let t = 0; t < 24; t++) {
      for (const c of w.countries)
        if (c.id === "USA") {
          c.stability = 5;
          c.insurgencyLevel = "REBELLION";
          c.legitimacy = 45;
        }
      const r = engine.executeTurn(w, [], generateDeterministicIntents(w));
      toppled += r.governmentChanges.filter(
        (g) => g.countryId === "USA" && (g.kind === "REVOLUTION" || g.kind === "COUP"),
      ).length;
      w = r.newState;
    }
    expect(toppled).toBe(0);
  });

  it("caps reparations relative to the winner's economy", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "PRK", seed: 8, mode: "LEGACY" });
    const prk = get(w, "PRK");
    const usa = get(w, "USA");
    const war = { id: "w1", attackerId: "PRK", defenderId: "USA", frontline: 90, exhaustion: 0, startTurn: 0 } as never;
    w.wars.push(war);
    prk.atWarWith.push("USA");
    usa.atWarWith.push("PRK");
    const before = prk.gdp;
    endWar(w, war, "PRK", "USA", new SeededRandom(1));
    expect(prk.gdp / before).toBeLessThanOrEqual(1.041);
  });
});

describe("Long-game economy and stats", () => {
  it("lets growth shocks fade back toward the structural trend", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 5, mode: "TERM" });
    const deu = get(w, "DEU");
    deu.growthRate = (deu.trendGrowth ?? 0.012) - 0.04; // a deep shock
    for (let t = 0; t < 24; t++) w = engine.executeTurn(w, [], generateDeterministicIntents(w)).newState;
    const after = get(w, "DEU");
    expect(Math.abs(after.growthRate - (after.trendGrowth ?? 0))).toBeLessThan(0.02);
  });

  it("does not saturate stability at 100 under constant reform", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "TUR", seed: 5, mode: "TERM" });
    let maxStability = 0;
    for (let t = 12; t < 36 && !w.gameOver; t++) {
      w = engine.executeTurn(w, [{ type: "DOMESTIC_REFORM" }], generateDeterministicIntents(w)).newState;
      if (t > 18) maxStability = Math.max(maxStability, get(w, "TUR").stability);
    }
    expect(maxStability).toBeLessThan(98);
  });
});
