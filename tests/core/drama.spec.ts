import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { publicWorldState } from "../../src/api/routes/game.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { computeOutcome } from "../../src/core/objectives.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const engine = new TurnEngine();
const get = (w: WorldState, id: string) => {
  const c = w.countries.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

describe("Drama director", () => {
  it("opens every session with a decision on turn 1", () => {
    for (const mode of ["TERM", "LEGACY"] as const) {
      const w = loader.newGame({ scenarioId: "2025", playerCountryId: "DEU", seed: 5, mode });
      const next = engine.executeTurn(w, [], generateDeterministicIntents(w)).newState;
      expect(next.pendingDecisions.length).toBeGreaterThan(0);
    }
  });

  it("never goes quiet for long in Term mode", () => {
    let w = loader.newGame({ scenarioId: "2025", playerCountryId: "FRA", seed: 9, mode: "TERM" });
    let longestGap = 0;
    let gap = 0;
    for (let t = 0; t < 30 && !w.gameOver; t++) {
      w = engine.executeTurn(w, [], generateDeterministicIntents(w)).newState;
      gap = w.pendingDecisions.length > 0 ? 0 : gap + 1;
      longestGap = Math.max(longestGap, gap);
    }
    expect(longestGap).toBeLessThanOrEqual(2);
  });

  it("does not repeat the same crisis template within the cooldown", () => {
    let w = loader.newGame({ scenarioId: "2025", playerCountryId: "ISR", seed: 3, mode: "TERM" });
    const seen = new Map<string, number>();
    for (let t = 0; t < 36 && !w.gameOver; t++) {
      w = engine.executeTurn(w, [], generateDeterministicIntents(w)).newState;
      for (const d of w.pendingDecisions) {
        if (["coup_plot", "streets_boiling", "foreign_interference", "general_strike"].includes(d.templateId))
          continue;
        const last = seen.get(d.templateId);
        if (last !== undefined) expect(w.turn - last, d.templateId).toBeGreaterThanOrEqual(9);
        seen.set(d.templateId, w.turn);
      }
    }
  });

  it("telegraphs a coup before it can happen", () => {
    const w = loader.newGame({ scenarioId: "2025", playerCountryId: "EGY", seed: 1, mode: "TERM" });
    const egy = get(w, "EGY");
    egy.legitimacy = 5;
    egy.stability = 10;
    const next = engine.executeTurn(w, [], []).newState;
    expect(next.gameOver).toBeNull();
    expect(next.pendingDecisions.some((d) => d.templateId === "coup_plot")).toBe(true);
  });

  it("schedules delayed follow-ups from crisis choices", () => {
    const w = loader.newGame({ scenarioId: "2025", playerCountryId: "GBR", seed: 2, mode: "TERM" });
    w.pendingDecisions = [
      {
        id: "dec_test",
        turn: 0,
        title: "Test",
        situation: "",
        affectedCountries: ["GBR"],
        deadlineTurn: 1,
        templateId: "hostage_crisis",
        urgency: "URGENT",
        options: [
          {
            id: "rescue",
            label: "Rescue",
            description: "",
            actions: [],
            effects: {},
            tensionDelta: 0,
            followUp: { templateId: "rescue_outcome", delay: 1 },
            backedBy: [],
          },
        ],
      },
    ];
    let next = engine.executeTurn(w, [], [], [{ decisionId: "dec_test", optionId: "rescue" }])
      .newState;
    expect(next.director.scheduled.some((s) => s.templateId === "rescue_outcome")).toBe(true);
    next = engine.executeTurn(next, [], []).newState;
    expect(next.director.lastUsed.rescue_outcome).toBe(1);
  });
});

describe("Modes & objectives", () => {
  it("Term mode ends at 48 turns with an outcome", () => {
    let w = loader.newGame({ scenarioId: "2025", playerCountryId: "CHN", seed: 4, mode: "TERM" });
    expect(w.maxTurns).toBe(48);
    while (!w.gameOver) w = engine.executeTurn(w, [], generateDeterministicIntents(w)).newState;
    expect(w.turn).toBeLessThanOrEqual(48);
    expect(w.outcome).not.toBeNull();
  });

  it("democracies face their election as the Term finale", () => {
    const w = loader.newGame({ scenarioId: "2025", playerCountryId: "DEU", seed: 4, mode: "TERM" });
    expect(get(w, "DEU").politicalSystem.nextElectionTurn).toBe(47);
  });

  it("stars reflect objectives and bonuses", () => {
    const w = loader.newGame({ scenarioId: "2025", playerCountryId: "USA", seed: 4, mode: "TERM" });
    w.gameOver = { reason: "TERM_COMPLETED", description: "", turn: 47 };
    w.score.total = 150;
    get(w, "USA").approval = 70;
    expect(computeOutcome(w).stars).toBe(3);
    w.gameOver = { reason: "LOST_ELECTION", description: "", turn: 47 };
    expect(computeOutcome(w)).toMatchObject({ victory: false, stars: 0 });
  });

  it("player leaders are never called 'You'", () => {
    const w = loader.newGame({ scenarioId: "2025", playerCountryId: "PRK", seed: 4 });
    expect(get(w, "PRK").leader.name).not.toBe("You");
  });
});

describe("Fog of war", () => {
  it("the client payload hides foreign ground truth", () => {
    const w = loader.newGame({ scenarioId: "2025", playerCountryId: "ISR", seed: 4 });
    const iran = get(w, "IRN");
    iran.nuclear.status = "DEVELOPING";
    iran.nuclear.progress = 77;
    const pub = publicWorldState(w);
    const pubIran = pub.countries.find((c) => c.id === "IRN");
    expect(pubIran?.beliefs).toEqual({});
    expect(pubIran?.manpower).toBe(0);
    expect(pubIran?.nuclear.progress).not.toBe(77);
    // the player's own country stays fully visible
    expect(pub.countries.find((c) => c.id === "ISR")).toEqual(get(w, "ISR"));
  });
});
