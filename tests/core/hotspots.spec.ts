import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { applyEffects, raiseCrisis } from "../../src/core/crises.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { generateAgenda } from "../../src/core/meetings.js";
import { SeededRandom } from "../../src/core/seed.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";

const loader = createDataLoader();
const step = (w: WorldState) =>
  new TurnEngine().executeTurn(
    w,
    [],
    generateDeterministicIntents(w),
    w.pendingDecisions.map((d) => ({ decisionId: d.id, optionId: d.defaultOptionId ?? d.options[0].id })),
  ).newState;
const zone = (w: WorldState, id: string) => w.hotspots.find((h) => h.id === id)!;
const me = (w: WorldState) => w.countries.find((c) => c.id === w.playerCountryId)!;

describe("Gaza and the West Bank", () => {
  it("are hot zones of their own in the modern eras, and the PSX state is the West Bank", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "ISR", seed: 3, mode: "TERM" });
    expect(w.countries.find((c) => c.id === "PSX")?.name).toBe("West Bank");
    expect(zone(w, "GAZA")).toMatchObject({ phase: "CEASEFIRE", mapId: "GAZ", occupier: "ISR" });
    expect(zone(w, "WEST_BANK")).toMatchObject({ mapId: "PSX" });
    expect(loader.newGame({ scenarioId: "2025", playerCountryId: "USA", seed: 3, mode: "TERM" }).hotspots[0].phase).toBe("WAR");
    expect(loader.newGame({ scenarioId: "1960", playerCountryId: "USA", seed: 3, mode: "TERM" }).hotspots).toEqual([]);
  });

  it("make the news every few months, deterministically", () => {
    const run = () => {
      let w = loader.newGame({ scenarioId: "2026", playerCountryId: "DEU", seed: 9, mode: "TERM" });
      const headlines: string[] = [];
      for (let t = 0; t < 8; t++) {
        w = step(w);
        headlines.push(...w.newspaper.filter((n) => n.relatedCountries.includes("PSX")).map((n) => n.headline));
      }
      return { w, headlines };
    };
    const a = run();
    const b = run();
    expect(a.w.hotspots).toEqual(b.w.hotspots);
    expect(a.headlines.length).toBeGreaterThanOrEqual(4);
    expect(zone(a.w, "GAZA").incidents.length).toBeGreaterThan(0);
  });

  it("break and restore the Gaza ceasefire through decisions", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "ISR", seed: 3, mode: "TERM" });
    applyEffects(w, me(w), { "hot:GAZA:war": 1 });
    expect(zone(w, "GAZA").phase).toBe("WAR");
    const w2 = step(step(w));
    expect(zone(w2, "GAZA").humanitarian).toBeGreaterThan(zone(w, "GAZA").humanitarian - 1);
    applyEffects(w2, me(w2), { "hot:GAZA:war": -1 });
    expect(zone(w2, "GAZA").phase).toBe("CEASEFIRE");
  });

  it("put Gaza crises and a standing staff meeting on Israel's desk", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "ISR", seed: 3, mode: "TERM" });
    w.pendingDecisions = []; // the cold open may already be this card
    const flare = raiseCrisis(w, "gaza_flare", new SeededRandom(1));
    expect(flare?.decision?.options.map((o) => o.id)).toEqual(["targeted", "offensive", "mediators"]);
    // The war with Iran takes the cabinet room first; the next month it is Gaza's turn
    w.director.lastUsed = { "meet:staff:front": w.turn };
    const agenda = generateAgenda(w);
    expect(agenda.some((m) => /Gaza and the West Bank/.test(m.title))).toBe(true);
  });

  it("never ask a player to improve relations with themselves", () => {
    const w = loader.newGame({ scenarioId: "2026", playerCountryId: "EGY", seed: 3, mode: "TERM" });
    const vote = raiseCrisis(w, "gaza_un_vote", new SeededRandom(1));
    for (const o of vote?.decision?.options ?? []) expect(o.effects["relations:EGY"]).toBeUndefined();
  });
});
