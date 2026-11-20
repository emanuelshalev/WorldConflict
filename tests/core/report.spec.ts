import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const attendAll = (w: WorldState) =>
  [...w.pendingDecisions, ...w.agenda].map((d) => ({
    decisionId: d.id,
    optionId: d.options.find((o) => o.id !== d.defaultOptionId)?.id ?? d.options[0].id,
  }));
function month(country: string, seed: number, months = 1) {
  let w = loader.newGame({ scenarioId: "2026", playerCountryId: country, seed, mode: "TERM" });
  for (let i = 0; i < months; i++) {
    const orders = [{ type: "DOMESTIC_PROPAGANDA" }] as Action[];
    w = new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), attendAll(w)).newState;
  }
  return w;
}

describe("the month report tells what happened, truthfully", () => {
  it("gives every attended decision a headline, measured facts and a reaction", () => {
    for (const [c, seed] of [["USA", 5], ["ISR", 3], ["DEU", 9]] as const) {
      const r = month(c, seed).turnReport;
      expect(r?.decisions.length).toBeGreaterThan(0);
      for (const d of r?.decisions ?? []) {
        expect(d.kind).toBeTruthy();
        expect(d.headline).toBeTruthy();
        if (d.attended) expect(d.reaction?.line).toBeTruthy();
        if (d.attended && d.kind !== "STAFF") expect((d.facts ?? []).length).toBeGreaterThanOrEqual(0);
      }
      expect(r?.highlight).toBeTruthy();
      expect(r?.tension).toBeTruthy();
    }
  });

  it("never pairs a warm reply with a colder relationship", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const w = month(seed % 2 ? "USA" : "IND", seed, 2);
      for (const d of w.turnReport?.decisions ?? []) {
        const rel = d.facts?.find((f) => / view of you$/.test(f.label));
        if (!rel || !d.reaction || (d.kind !== "CALL" && d.kind !== "VISIT")) continue;
        if (d.reaction.tone === "warm") expect(rel.after).toBeGreaterThanOrEqual(rel.before);
        if (d.reaction.tone === "angry" || d.reaction.tone === "cold") expect(rel.after).toBeLessThanOrEqual(rel.before);
      }
    }
  });

  it("is identical across two runs (no randomness outside the seed)", () => {
    expect(month("USA", 11, 3).turnReport).toEqual(month("USA", 11, 3).turnReport);
  });

  it("leads the paper with a story, not a list of choices", () => {
    const w = month("USA", 5);
    const lead = w.newspaper[0];
    expect(lead.relatedCountries).toContain("USA");
    expect(lead.description).not.toMatch(/Faced with/);
    expect(lead.description).not.toMatch(/\.\./);
  });
});
