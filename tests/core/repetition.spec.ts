import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { buildAdvice } from "../../src/core/advisors.js";
import { CRISIS_SCENE } from "../../src/core/crises.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { SESSION_LINE_MAX } from "../../src/core/reactions.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";
import { CONTROL_SEEDS, playControl } from "../fixtures/control.js";

const loader = createDataLoader();

function staffStep(w: WorldState): WorldState {
  const a = buildAdvice(w);
  const decisions = [
    ...Object.entries(a.cabinetPicks).map(([decisionId, optionId]) => ({ decisionId, optionId })),
    ...Object.entries(a.meetingPicks).map(([decisionId, optionId]) => ({ decisionId, optionId })),
  ];
  const orders = a.staffOrders.map(({ action: { label: _l, ...x } }) => x);
  return new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), decisions).newState;
}

function play(country: string, seed: number, months: number): WorldState[] {
  let w = loader.newGame({ scenarioId: "2026", playerCountryId: country, seed, mode: "TERM" });
  const out: WorldState[] = [];
  for (let t = 0; t < months && !w.gameOver; t++) {
    w = staffStep(w);
    out.push(w);
  }
  return out;
}

describe("anti-repetition", () => {
  it("no reaction line appears twice in one month (AC-24)", () => {
    for (const [c, seed] of [
      ["PAK", 2],
      ["USA", 5],
      ["UKR", 7],
    ] as const) {
      for (const w of play(c, seed, 12)) {
        const r = w.turnReport;
        const lines = [...(r?.decisions ?? []), ...(r?.orders ?? [])]
          .map((x) => x.reaction?.line)
          .filter((x): x is string => !!x && !/answered within the month/.test(x));
        expect(new Set(lines).size).toBe(lines.length);
        const calls = (r?.decisions ?? []).filter((d) => d.kind === "CALL" && d.headline);
        const verbs = calls.map((d) => d.headline?.split(" ").slice(-3).join(" "));
        expect(new Set(verbs).size).toBe(verbs.length);
      }
    }
  });

  it("the same leader does not call twice within three months unless the war or their view moved", () => {
    for (const [c, seed] of [
      ["UKR", 7],
      ["PAK", 2],
    ] as const) {
      const months = play(c, seed, 12);
      const lastCall = new Map<string, number>();
      for (const w of months) {
        for (const m of w.agenda.filter((x) => x.kind === "CALL" && x.withCountry)) {
          const id = m.withCountry as string;
          const prev = lastCall.get(id);
          if (prev !== undefined && w.turn - prev < 3) expect(m.title).toMatch(/again/);
          lastCall.set(id, w.turn);
        }
      }
    }
  });

  it("keeps a bounded memory of recent lines", () => {
    const months = play("USA", 5, 12);
    const last = months[months.length - 1];
    expect(last.director.recentLines.length).toBeGreaterThan(0);
    expect(last.director.recentLines.length).toBeLessThanOrEqual(80);
  });

  it("marks orders repeated from last month and counts uses in six months", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 5, mode: "TERM" });
    const engine = new TurnEngine();
    for (let t = 0; t < 3; t++)
      w = engine.executeTurn(w, [{ type: "DOMESTIC_PROPAGANDA" }], generateDeterministicIntents(w), []).newState;
    const o = w.turnReport?.orders.find((x) => x.type === "DOMESTIC_PROPAGANDA");
    expect(o?.again).toBe(3);
  });

  it("never stages two random crises running in the same scene (R1)", () => {
    for (const [c, seed] of [
      ["USA", 5],
      ["DEU", 9],
      ["BRA", 3],
    ] as const) {
      let w = loader.newGame({ scenarioId: "2026", playerCountryId: c, seed, mode: "TERM" });
      let prevScenes = new Set<string>();
      for (let t = 0; t < 24 && !w.gameOver; t++) {
        w = staffStep(w);
        const fresh = w.pendingDecisions.filter((d) => d.turn === w.turn - 1 || d.turn === w.turn);
        const followUp = w.turnReport?.followUpsResolved?.length;
        const scenes = new Set(fresh.map((d) => CRISIS_SCENE[d.templateId]).filter(Boolean));
        if (!followUp && fresh.length === 1 && !d0Scripted(fresh[0].templateId))
          for (const s of scenes) expect(prevScenes.has(s)).toBe(false);
        prevScenes = scenes;
      }
    }
  });
});

/** Scripted, shock and reactive crises (raised by events, not the weighted pick) are exempt. */
const d0Scripted = (id: string) => id.startsWith("shock_") || id === "election_campaign" || id === "coup_plot" || id === "streets_boiling" || id === "pact_offer" || id === "foreign_interference";

// QA3R-1a (F-00-6, QA0-8c): "That was a better conversation than either of us expected" came
// back 5 to 7 times a game from different leaders; no line repeated inside a month or for one
// speaker, so the per-speaker guard passed. The cap holds across speakers and months, on every
// control seed and the three harness policies that hold calls.
describe("no reaction line more than twice a session (QA3R-1a)", () => {
  for (const policy of ["staff", "staffswitch", "picks"] as const)
    it(`${policy}: the nine control seeds, 12 months, every card's reaction and street voice`, () => {
      for (const code of CONTROL_SEEDS) {
        const counts = new Map<string, number>();
        for (const m of playControl(code, policy).months) {
          const r = m.after.turnReport!;
          for (const x of [...r.decisions, ...r.orders]) {
            const line = x.reaction?.line;
            if (!line || /answered within the month/.test(line)) continue;
            counts.set(line, (counts.get(line) ?? 0) + 1);
          }
        }
        const over = [...counts].filter(([, n]) => n > SESSION_LINE_MAX);
        expect(over, code).toEqual([]);
      }
    });
});
