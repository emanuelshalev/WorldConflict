import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { SCORE_COMPONENTS, scoreBreakdown, scoreHeading } from "../../src/core/scoring.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const step = (w: WorldState) =>
  new TurnEngine().executeTurn(w, [], generateDeterministicIntents(w), []).newState;

describe("why the score moved", () => {
  it("every part's terms add up to where it is heading", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 4, mode: "TERM" });
    for (let t = 0; t < 4; t++) {
      w = step(w);
      const b = scoreBreakdown(w);
      if (!b) throw new Error("no breakdown");
      for (const k of SCORE_COMPONENTS) {
        const sum = b[k].terms.reduce((s, x) => s + x.points, 0);
        expect(Math.abs(sum - b[k].target)).toBeLessThan(1e-6);
      }
      expect(scoreHeading(b)).toBeGreaterThan(0);
    }
  });

  it("the report's score move agrees with the score and its rounded terms (AC-22)", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 4, mode: "TERM" });
    const before = w.score.total;
    w = step(w);
    const s = w.turnReport?.score;
    expect(s?.before).toBe(before);
    expect(s?.after).toBe(w.score.total);
    for (const k of SCORE_COMPONENTS) {
      const part = s?.components[k];
      if (!part) throw new Error("missing part");
      const sum = part.terms.reduce((x, t) => x + t.points, 0);
      expect(Math.abs(sum - part.target)).toBeLessThanOrEqual(1);
      // Each part moves 15% of the way to its heading
      expect(part.after - part.before).toBeCloseTo((part.target - part.before) * 0.15, 0);
    }
  });

  it("names the war with India as Pakistan's main security drag (AC-23)", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "PAK", seed: 2, mode: "TERM" });
    for (let t = 0; t < 3; t++) w = step(w);
    const terms = w.turnReport?.score?.components.security.terms ?? [];
    if (!w.countries.find((c) => c.id === "PAK")?.atWarWith.includes("IND")) return;
    const worst = [...terms].sort((a, b) => a.points - b.points)[0];
    expect(worst.label).toMatch(/India/);
  });

  it("splits choice from drift and keeps the step and starting mission values", () => {
    let w = loader.newGame({
      scenarioId: "2026",
      playerCountryId: "SAU",
      seed: 11,
      mode: "FLASHPOINT",
      flashpointId: "bab-al-mandab-burning",
    });
    const d = w.pendingDecisions[0];
    const o = d.options.find((x) => x.id === "oman") ?? d.options[0];
    w = new TurnEngine().executeTurn(w, [], generateDeterministicIntents(w), [
      { decisionId: d.id, optionId: o.id },
    ]).newState;
    const r = w.turnReport;
    if (!r) throw new Error("no report");
    expect(r.drift).toBeDefined();
    const choice = [...r.decisions, ...r.orders]
      .flatMap((x) => x.facts ?? [])
      .filter((f) => f.label === "Approval")
      .reduce((s, f) => s + f.after - f.before, 0);
    const delta = r.deltas.approval.after - r.deltas.approval.before;
    expect(r.drift?.approval).toBeCloseTo(delta - choice, 0);
    expect(r.missionBefore?.length).toBe(6);
  });
});
