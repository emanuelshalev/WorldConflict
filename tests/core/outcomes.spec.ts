import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const step = (w: WorldState, orders: Action[]) => {
  const decs = w.pendingDecisions.map((d) => ({ decisionId: d.id, optionId: d.defaultOptionId ?? d.options[0].id }));
  return new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), decs).newState;
};

describe("order outcomes", () => {
  it("reports what a deployment changed and tracks it in the ledger", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 7, mode: "TERM" });
    const deploy = { type: "MILITARY_DEPLOY_BORDER", targetCountryId: "VEN", value: 50000 } as Action;
    w = step(w, [deploy]);
    const o = w.turnReport?.orders[0];
    expect(o?.ok).toBe(true);
    expect(o?.story).toMatch(/Venezuela/);
    const troops = o?.facts?.find((f) => f.label === "Troops facing Venezuela");
    expect(troops).toMatchObject({ before: 0, after: 50000 });
    w = step(w, [{ ...deploy, value: 30000 }]);
    expect(w.turnReport?.orders[0].story).toMatch(/2nd order of this kind/);
    expect(w.director.ledger.MILITARY_DEPLOY_BORDER.map((e) => e.value)).toEqual([50000, 80000]);
  });

  it("is deterministic: the same game tells the same story", () => {
    const run = () => {
      let w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 3, mode: "TERM" });
      w = step(w, [{ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "RUS" } as Action, { type: "DOMESTIC_PROPAGANDA" } as Action]);
      return JSON.stringify(w.turnReport?.orders);
    };
    expect(run()).toBe(run());
  });

  it("explains a refused order instead of a bare reason", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed: 3, mode: "TERM" });
    w = step(w, [{ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "RUS" } as Action]);
    const o = w.turnReport?.orders[0];
    if (o && !o.ok) expect(o.story?.length ?? 0).toBeGreaterThan(o.detail.length);
  });
});
