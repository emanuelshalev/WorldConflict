import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { factWeight, recordMonth } from "../../src/core/chronicle.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { TurnEngine } from "../../src/core/turn.js";
import { type WorldState, WorldStateSchema } from "../../src/core/types.js";

const loader = createDataLoader();

function playHormuz(seed: number): WorldState {
  let w = loader.newGame({
    scenarioId: "2026",
    playerCountryId: "USA",
    seed,
    flashpointId: "hormuz-convoy",
  });
  const engine = new TurnEngine();
  while (!w.gameOver) {
    const decisions = w.pendingDecisions.map((d) => ({ decisionId: d.id, optionId: d.options[0].id }));
    w = engine.executeTurn(
      w,
      [
        { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "IRN" },
        { type: "DOMESTIC_PROPAGANDA" },
      ],
      generateDeterministicIntents(w),
      decisions,
    ).newState;
  }
  return w;
}

describe("chronicle recording", () => {
  it("takes the opening picture when the session is built", () => {
    const w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "USA",
      seed: 3,
      flashpointId: "hormuz-convoy",
    });
    const start = w.chronicle?.start;
    expect(start?.worstRival).toBe("IRN");
    expect(start?.tracked).toEqual(expect.arrayContaining(["IRN", "ARE", "ISR"]));
    expect(start?.nuclear.IRN).toBeDefined();
    expect(start?.tension).toBe(Math.round(w.globalTension * 10) / 10);
    expect(w.chronicle?.series).toEqual([]);
  });

  it("records every month, final month included, with objectives and moments", () => {
    const w = playHormuz(5);
    const ch = w.chronicle;
    expect(ch?.series).toHaveLength(w.turn);
    expect(ch?.series.map((s) => s.turn)).toEqual(Array.from({ length: w.turn }, (_, i) => i));
    const last = ch?.series.at(-1);
    expect(last?.score).toBe(w.score.total);
    expect(last?.objectives).toHaveLength(
      (w.objective?.primary.length ?? 0) + (w.objective?.bonus.length ?? 0),
    );
    expect(Object.keys(last?.relations ?? {})).toEqual(w.chronicle?.start?.tracked);
    // The ceasefire order ends the US-Iran war and the chronicle remembers when
    expect(ch?.moments.some((m) => m.kind === "WAR_END" && m.with === "IRN")).toBe(true);
    expect(ch?.firsts["ceasefire:IRN"]).toBeDefined();
    expect(ch?.moments.filter((m) => m.kind === "CRISIS").length).toBeGreaterThan(3);
    expect(ch?.deals).toBeGreaterThanOrEqual(1);
    // At most six moments a month beyond the story beats, and small enough to save
    expect(JSON.stringify(ch).length).toBeLessThan(60_000);
  });

  it("is deterministic: same seed and orders give the same chronicle", () => {
    expect(playHormuz(11).chronicle).toEqual(playHormuz(11).chronicle);
  });

  it("survives a save round trip, and old saves without it still load and start one", () => {
    const w = playHormuz(5);
    const back = WorldStateSchema.parse(JSON.parse(JSON.stringify(w)));
    expect(back.chronicle).toEqual(w.chronicle);

    const fresh = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 2, mode: "TERM" });
    const { chronicle: _drop, ...old } = fresh;
    const loaded = WorldStateSchema.parse(JSON.parse(JSON.stringify(old)));
    expect(loaded.chronicle).toBeUndefined();
    const next = new TurnEngine().executeTurn(loaded, [], generateDeterministicIntents(loaded), []);
    expect(next.newState.chronicle?.series).toHaveLength(1);
  });

  it("keeps the first month of the final unbroken run for each objective", () => {
    const w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "USA",
      seed: 9,
      flashpointId: "hormuz-convoy",
    });
    const usa = w.countries.find((c) => c.id === "USA");
    if (!usa) throw new Error("no USA");
    const approvalIdx = (w.objective?.primary ?? []).findIndex((c) => c.kind === "STAT_MIN");
    const at = (turn: number, approval: number) => {
      w.turn = turn;
      usa.approval = approval;
      recordMonth(w, null);
    };
    at(0, 60);
    at(1, 40);
    at(2, 60);
    at(3, 61);
    expect(w.chronicle?.firsts[`cond:${approvalIdx}`]).toBe(2);
    const kinds = w.chronicle?.moments.map((m) => m.kind);
    expect(kinds).toContain("OBJECTIVE_LOST");
    expect(kinds).toContain("OBJECTIVE_MET");
  });

  it("weights facts by direction: good moves up, bad moves down", () => {
    expect(factWeight([{ label: "Approval", before: 40, after: 46, unit: "%", good: true }])).toBe(6);
    expect(factWeight([{ label: "World tension", before: 50, after: 56, good: false }])).toBe(-4);
    expect(factWeight([])).toBe(0);
  });
});
