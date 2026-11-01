import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { classifyLeadership } from "../../src/core/scoring.js";
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
