import { describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";
import { actionImpact, impactContext, optionImpact } from "../../src/core/missionImpact.js";
import { objectiveStatus, shortLabel } from "../../src/core/objectives.js";
import type { DecisionOption, WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const babSau = () =>
  loader.newGame({
    scenarioId: "2026",
    playerCountryId: "SAU",
    seed: 11,
    mode: "FLASHPOINT",
    flashpointId: "bab-al-mandab-burning",
  });
const option = (w: WorldState, id: string): DecisionOption => {
  const o = w.pendingDecisions.flatMap((d) => d.options).find((x) => x.id === id);
  if (!o) throw new Error(`no option ${id}`);
  return o;
};
const opt = (effects: Record<string, number>, actions: DecisionOption["actions"] = []): DecisionOption => ({
  id: "x",
  label: "x",
  description: "",
  effects,
  actions,
  tensionDelta: 0,
  backedBy: [],
});

describe("mission status (goal line)", () => {
  it("gives every numeric goal its now, need, unit and a state", () => {
    const w = babSau();
    const st = objectiveStatus(w);
    const stab = st.find((s) => s.label.includes("stability"));
    const me = w.countries.find((c) => c.id === "SAU");
    expect(stab?.unit).toBe("%");
    expect(stab?.need).toBe(78);
    expect(stab?.now).toBeCloseTo(me?.stability ?? 0, 0);
    expect(["on_track", "close", "off_track", "failed"]).toContain(stab?.state);
    const score = st.find((s) => s.unit === "score");
    expect(score?.need).toBe(114);
    // A goal met from the start is on track, never "2/4" filler
    expect(st.find((s) => s.label.startsWith("No open war"))?.state).toBe("on_track");
  });

  it("short labels cut the authored label at the first bracket or colon", () => {
    expect(shortLabel({ kind: "STAT_MIN", label: "The kingdom holds its nerve (stability 78%+)" })).toBe(
      "The kingdom holds its nerve",
    );
    expect(shortLabel({ kind: "STAT_MIN", label: "x (y)", short: "Keep calm" })).toBe("Keep calm");
  });
});

describe("mission impact", () => {
  it("tags the Bab al-Mandab opening: Muscat helps, Bomb Sanaa hurts stability (AC-8)", () => {
    const w = babSau();
    const muscat = optionImpact(w, option(w, "oman"));
    const sanaa = optionImpact(w, option(w, "sanaa"));
    expect(muscat.helps.length).toBeGreaterThan(0);
    expect(muscat.hurts).toHaveLength(0);
    expect(sanaa.hurts.some((h) => /nerve/.test(h))).toBe(true);
    expect(muscat.score).toBeGreaterThan(sanaa.score);
  });

  it("declaring war on a NO_WAR_WITH target breaks the mission", () => {
    const w = babSau();
    const imp = actionImpact(w, { type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "ARE" });
    expect(imp.breaks).toHaveLength(1);
    expect(imp.score).toBeLessThanOrEqual(-20);
  });

  it("maps stats, relations and ceasefires by sign", () => {
    const w = babSau();
    const ctx = impactContext(w);
    expect(optionImpact(w, opt({ stability: 5 }), ctx).helps).toContain("The kingdom holds its nerve");
    expect(optionImpact(w, opt({ stability: -5 }), ctx).hurts.length).toBe(1);
    expect(optionImpact(w, opt({ "relations:USA": 6 }), ctx).bonusHelps.length).toBe(1);
    const cease = actionImpact(w, { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "YEM" }, ctx);
    // Ending the war meets the war goal, the score goal and the settlement bonus
    expect(cease.helps.length).toBeGreaterThanOrEqual(1);
    expect(cease.bonusHelps.length).toBe(1);
    // Small effects tag nothing
    expect(optionImpact(w, opt({ approval: -0.5 }), ctx).links).toHaveLength(0);
  });

  it("is a pure read: the world is unchanged", () => {
    const w = babSau();
    const before = JSON.stringify(w);
    for (const d of w.pendingDecisions) for (const o of d.options) optionImpact(w, o);
    actionImpact(w, { type: "DOMESTIC_REFORM" });
    expect(JSON.stringify(w)).toBe(before);
  });
});
