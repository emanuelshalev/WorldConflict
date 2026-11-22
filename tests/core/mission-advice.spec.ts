import { describe, expect, it } from "vitest";
import { buildAdvice, cabinetPick, computeSuggestions, missionNote, primaryScore } from "../../src/core/advisors.js";
import { orderRules } from "../../src/core/availability.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { impactContext, optionImpact } from "../../src/core/missionImpact.js";
import { previewAction } from "../../src/core/preview.js";
import type { WorldState } from "../../src/core/types.js";

/**
 * QA S2-2: the desk's mission tags and the cabinet note must never contradict each other, and
 * Dan's case: the staff must not re-suggest "Mobilize forces" at full mobilization.
 */

const loader = createDataLoader();
const seats = loader.loadAvailableFlashpoints().flatMap((fp) => fp.playable.map((p) => ({ id: fp.id, country: p.countryId })));
const open = (id: string, country: string, seed = 11): WorldState =>
  loader.newGame({ scenarioId: "2026", playerCountryId: country, seed, mode: "FLASHPOINT", flashpointId: id, difficulty: "STATESMAN" });

describe("mission notes on every flashpoint seat's month-1 decisions", () => {
  it("covers every seat", () => {
    expect(seats.length).toBeGreaterThanOrEqual(16);
  });

  for (const seat of seats)
    it(`${seat.id}:${seat.country}`, () => {
      const world = open(seat.id, seat.country);
      const ctx = impactContext(world);
      const advice = buildAdvice(world);
      for (const d of world.pendingDecisions) {
        const note = advice.missionNotes[d.id];
        const scores = d.options.map((o) => primaryScore(optionImpact(world, o, ctx)));
        if (!note) continue;
        const pick = d.options.find((o) => o.id === note.optionId);
        expect(pick, d.title).toBeDefined();
        if (!pick) continue;
        const impact = optionImpact(world, pick, ctx);
        // The mission pick has the best net effect on the primary goals
        expect(primaryScore(impact), d.title).toBe(Math.max(...scores));
        // "Best for your mission" never stands beside a Hurts or Breaks on a primary goal
        const harms = impact.hurts.length + impact.breaks.length;
        if (note.kind === "best") expect(harms, `${d.title}: ${note.text}`).toBe(0);
        else {
          expect(harms, d.title).toBeGreaterThan(0);
          for (const c of note.costs) expect(note.text, d.title).toContain(c);
          if (note.kind === "tradeoff") expect(note.text).toMatch(/^Best trade-off: helps .+, costs .+/);
        }
        // The switch never offers an option that hurts the goal it cites, or is no better
        if (note.switchFrom) {
          const cab = d.options.find((o) => o.id === note.switchFrom?.cabinetId);
          expect(cab?.id, d.title).toBe(cabinetPick(world, d, world.politicalCapital, ctx).id);
          const cabImpact = optionImpact(world, cab ?? pick, ctx);
          expect([...cabImpact.hurts, ...cabImpact.breaks], d.title).toContain(note.switchFrom.goal);
          expect([...impact.hurts, ...impact.breaks], d.title).not.toContain(note.switchFrom.goal);
          expect(primaryScore(impact), d.title).toBeGreaterThan(primaryScore(cabImpact));
        }
      }
    });

  it("no note when every option is equal on the mission", () => {
    const world = open("hormuz-convoy", "USA");
    const d = world.pendingDecisions[0];
    expect(d).toBeDefined();
    const same = { ...d, options: d.options.map((o) => ({ ...o, effects: {}, actions: [], tensionDelta: 0 })) };
    expect(missionNote(world, same)).toBeNull();
  });
});

describe("staff and full mobilization (Dan)", () => {
  /** A war the player is winning, at the given mobilization. */
  function winning(mobilization: number): WorldState {
    const world = open("ceasefire-or-collapse", "RUS");
    const me = world.countries.find((c) => c.id === "RUS");
    const war = world.wars.find((w) => [w.attackerId, w.defenderId].includes("RUS") && [w.attackerId, w.defenderId].includes("UKR"));
    if (!me || !war) throw new Error("fixture: no RUS-UKR war");
    war.frontline = war.attackerId === "RUS" ? 62 : 38;
    me.mobilizationLevel = mobilization;
    return world;
  }
  const mobilize = (w: WorldState) => computeSuggestions(w, 20).some((s) => s.action.type === "MILITARY_MOBILIZE");

  it("suggests a call-up while there is room, never at full mobilization", () => {
    expect(mobilize(winning(40))).toBe(true);
    expect(mobilize(winning(100))).toBe(false);
    expect(buildAdvice(winning(100)).staffOrders.some((o) => o.action.type === "MILITARY_MOBILIZE")).toBe(false);
  });

  it("refuses Mobilize at 100% before Execute, so it never costs stability for nothing", () => {
    const w = winning(100);
    expect(orderRules(w, { type: "MILITARY_MOBILIZE" })?.code).toBe("FULLY_MOBILIZED");
    expect(previewAction(w, { type: "MILITARY_MOBILIZE" }).block?.code).toBe("FULLY_MOBILIZED");
    expect(orderRules(winning(60), { type: "MILITARY_MOBILIZE" })).toBeNull();
  });
});
