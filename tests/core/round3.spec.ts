import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { previewAction } from "../../src/core/preview.js";
import { denounceApprovalDelta } from "../../src/core/systems/diplomacy.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const engine = new TurnEngine();
const get = (w: WorldState, id: string) => {
  const c = w.countries.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c;
};

describe("Denunciations", () => {
  const w = loader.newGame({ scenarioId: "2026", playerCountryId: "TWN", seed: 3, mode: "TERM" });
  const twn = get(w, "TWN");

  it("rallies the public against an adversary, less each time", () => {
    const chn = get(w, "CHN");
    expect(denounceApprovalDelta(twn, chn, 0)).toBe(2);
    expect(denounceApprovalDelta(twn, chn, 1)).toBe(1);
    expect(denounceApprovalDelta(twn, chn, 3)).toBeLessThan(0.5);
  });

  it("costs approval when the target is a partner, and nothing for a bystander", () => {
    const partner = w.countries.find(
      (c) => c.id !== "TWN" && (twn.relations[c.id] ?? 0) >= 25,
    );
    const bystander = w.countries.find(
      (c) =>
        c.id !== "TWN" &&
        Math.abs(twn.relations[c.id] ?? 0) < 20 &&
        !twn.history.historicalRivals.includes(c.id) &&
        !twn.alliances.includes(c.id),
    );
    if (!partner || !bystander) throw new Error("fixture");
    expect(denounceApprovalDelta(twn, partner, 0)).toBe(-2);
    expect(denounceApprovalDelta(twn, bystander, 0)).toBe(0);
  });

  it("is no longer a free monthly approval pump", () => {
    const run = (denounce: boolean) => {
      let s = w;
      for (let t = 0; t < 6; t++) {
        s = engine.executeTurn(
          s,
          denounce ? [{ type: "DIPLOMACY_DENOUNCE", targetCountryId: "CHN" }] : [],
          generateDeterministicIntents(s),
        ).newState;
        if (denounce) {
          const order = s.turnReport?.orders.find((o) => o.label.startsWith("Denounce"));
          expect(order?.detail).toMatch(/approval/i);
        }
      }
      return s;
    };
    const loud = run(true);
    const quiet = run(false);
    expect(loud.director.denounceTurns.length).toBeGreaterThan(0);
    // The old rule was +2 every month: 12 points over six months.
    expect(get(loud, "TWN").approval - get(quiet, "TWN").approval).toBeLessThan(6);
  });

  it("previews the same approval effect the engine applies", () => {
    const p = previewAction(w, { type: "DIPLOMACY_DENOUNCE", targetCountryId: "CHN" });
    const mood = p.effects.find((e) => e.metric === "Approval");
    expect(mood?.delta).toBe("+2");
  });
});
