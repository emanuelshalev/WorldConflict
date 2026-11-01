import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
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
