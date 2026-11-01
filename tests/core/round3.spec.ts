import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { previewAction } from "../../src/core/preview.js";
import {
  ceasefireChance,
  denounceApprovalDelta,
  TERMS_COST,
  targetAdvantage,
} from "../../src/core/systems/diplomacy.js";
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

describe("Iran's recovery path", () => {
  it("lets a spy hunt foil most foreign operations for three months", () => {
    let foiled = 0;
    let attempts = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let s = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed, mode: "TERM" });
      s = engine.executeTurn(s, [{ type: "INTEL_COUNTER_INTEL" }], generateDeterministicIntents(s)).newState;
      expect(s.director.counterIntelUntil).toBe(s.turn + 1);
      for (let t = 0; t < 2 && !s.gameOver; t++) {
        const intents = generateDeterministicIntents(s);
        attempts += intents
          .flatMap((i) => i.actions)
          .filter((a) => a.targetCountryId === "IRN" && a.type.startsWith("INTEL_")).length;
        s = engine.executeTurn(s, [], intents).newState;
        const cause = s.turnReport?.causes.find((c) => c.startsWith("Counter-intelligence rolled up"));
        const m = cause?.match(/up (an operation|(\d+) operations)/);
        if (m) foiled += m[2] ? Number(m[2]) : 1;
      }
    }
    expect(attempts).toBeGreaterThan(0);
    expect(foiled / attempts).toBeGreaterThan(0.35);
  });

  it("previews the shield", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    const p = previewAction(w, { type: "INTEL_COUNTER_INTEL" });
    expect(p.effects.some((e) => e.metric === "Foreign operations")).toBe(true);
  });

  it("lets a clearly losing side sue for peace on the winner's terms", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    const iran = get(w, "IRN");
    const usa = get(w, "USA");
    const war = { attackerId: "USA", frontline: 70, exhaustion: 45 };
    const onTerms = ceasefireChance(war, iran, usa);
    const ahead = ceasefireChance({ ...war, frontline: 60 }, iran, usa);
    expect(onTerms).toBeGreaterThan(ahead * 2);
    expect(targetAdvantage(war, iran)).toBe(70);
    const p = previewAction(
      { ...w, wars: w.wars.map((x) => (x.attackerId === "USA" && x.defenderId === "IRN" ? { ...x, frontline: 70 } : x)) },
      { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "USA" },
    );
    expect(p.summary).toMatch(/terms/);
    expect(p.effects.find((e) => e.metric === "Legitimacy")?.delta).toBe(`-${TERMS_COST.legitimacy}`);
  });

  it("treats Iran's wartime contraction as a shock, not its structural trend", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "IRN", seed: 1, mode: "TERM" });
    const iran = get(w, "IRN");
    expect(iran.growthRate).toBeLessThan(0);
    expect(iran.trendGrowth).toBeGreaterThan(0);
    // Countries without an explicit trend keep their override as the trend
    const deu = get(w, "DEU");
    expect(deu.trendGrowth).toBe(deu.growthRate);
  });
});
