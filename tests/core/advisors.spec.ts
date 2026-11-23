import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import {
  COURT_FLOOR,
  buildAdvice,
  cabinetPick,
  computeSuggestions,
  missionPick,
  missionStatus,
  staffMayRepeat,
} from "../../src/core/advisors.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { optionImpact } from "../../src/core/missionImpact.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Difficulty, WorldState } from "../../src/core/types.js";
import { CONTROL_SEEDS, playControl, playerRel } from "../fixtures/control.js";

const loader = createDataLoader();
const fp = (id: string, country: string, difficulty: Difficulty = "STATESMAN", seed = 11) =>
  loader.newGame({
    scenarioId: "2026",
    playerCountryId: country,
    seed,
    mode: "FLASHPOINT",
    flashpointId: id,
    difficulty,
  });

/** One month played the way the staff autopilot plays it. */
function staffStep(w: WorldState): WorldState {
  const a = buildAdvice(w);
  const decisions = [
    ...Object.entries(a.cabinetPicks).map(([decisionId, optionId]) => ({ decisionId, optionId })),
    ...Object.entries(a.meetingPicks).map(([decisionId, optionId]) => ({ decisionId, optionId })),
  ];
  const orders = a.staffOrders.map(({ action: { label: _l, ...x } }) => x);
  return new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), decisions).newState;
}

describe("advisors", () => {
  it("suggests orders with a why line that carries a number", () => {
    const w = fp("bab-al-mandab-burning", "SAU");
    const s = computeSuggestions(w);
    expect(s.length).toBeGreaterThanOrEqual(2);
    for (const x of s.slice(0, 3)) {
      expect(x.why.length).toBeLessThanOrEqual(140);
      expect(x.why).toMatch(/\d/);
    }
  });

  it("is deterministic and never mutates the world", () => {
    const w = fp("hormuz-convoy", "USA");
    const before = JSON.stringify(w);
    expect(JSON.stringify(buildAdvice(w))).toBe(JSON.stringify(buildAdvice(w)));
    missionStatus(w);
    expect(JSON.stringify(w)).toBe(before);
  });

  it("ANALYST keeps the safety net: the cabinet pick never works against the mission (AC-11)", () => {
    for (const [id, c] of [
      ["bab-al-mandab-burning", "SAU"],
      ["hormuz-convoy", "USA"],
      ["fire-on-the-nile", "SDN"],
      ["ceasefire-or-collapse", "USA"],
    ] as const) {
      let w = fp(id, c, "ANALYST");
      for (let t = 0; t < 6 && !w.gameOver; t++) {
        for (const d of w.pendingDecisions) {
          const pick = cabinetPick(w, d);
          const safe = d.options.filter((o) => {
            const i = optionImpact(w, o);
            return i.hurts.length + i.breaks.length + i.bonusHurts.length === 0;
          });
          if (safe.length) {
            const i = optionImpact(w, pick);
            expect(i.hurts.length + i.breaks.length).toBe(0);
          }
        }
        w = staffStep(w);
      }
    }
  });

  it("the mission pick scores at least as well as the cabinet pick", () => {
    const w = fp("bab-al-mandab-burning", "SAU");
    for (const d of w.pendingDecisions) {
      const m = optionImpact(w, missionPick(w, d)).score;
      const c = optionImpact(w, cabinetPick(w, d)).score;
      expect(m).toBeGreaterThanOrEqual(c);
    }
  });

  it("staff never queue the same order type two months running (AC-14)", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "PAK", seed: 3, mode: "TERM" });
    const byMonth: string[][] = [];
    for (let t = 0; t < 8 && !w.gameOver; t++) {
      byMonth.push(buildAdvice(w).staffOrders.map((o) => o.action.type));
      w = staffStep(w);
    }
    for (let i = 1; i < byMonth.length; i++)
      for (const type of byMonth[i]) expect(byMonth[i - 1]).not.toContain(type);
    expect(byMonth.flat().length).toBeGreaterThan(0);
    expect(staffMayRepeat(w, "NO_SUCH_ORDER" as never)).toBe(true);
  });

  it("the goal line lists what helps each goal and picks one step", () => {
    const w = fp("bab-al-mandab-burning", "SAU");
    const st = missionStatus(w);
    expect(st.some((s) => (s.helps ?? []).length > 0)).toBe(true);
    expect(st.filter((s) => s.step).length).toBeLessThanOrEqual(1);
    const help = st.flatMap((s) => s.helps ?? []).find((h) => h.kind === "crisis");
    expect(help?.id && help.optionId).toBeTruthy();
  });
});

describe("staff courts on the control seeds (QA3R-1b, F-00-7, F-02-8)", () => {
  const seeds = CONTROL_SEEDS.map((code) => playControl(code, "staff"));
  it("no court proposal at a relation of -85 or worse (Court Poland at -99)", () => {
    const bad = seeds.flatMap((g) =>
      g.months.flatMap((m) =>
        m.advice.staffOrders
          .filter(
            (o) =>
              o.action.type === "DIPLOMACY_IMPROVE_RELATIONS" &&
              playerRel(m.before, o.action.targetCountryId ?? "") <= COURT_FLOOR,
          )
          .map((o) => `${g.code} m${m.before.turn + 1} ${o.action.label}`),
      ),
    );
    expect(bad).toEqual([]);
  });

  it("no order type + target proposed in more than 3 of 6 consecutive months, courts without a primary goal at most 2", () => {
    for (const g of seeds) {
      const byKey = new Map<string, number[]>();
      for (const m of g.months)
        for (const o of m.advice.staffOrders) {
          const key = `${o.action.type}|${o.action.targetCountryId ?? ""}`;
          byKey.set(key, [...(byKey.get(key) ?? []), m.before.turn]);
        }
      const primary = new Set(
        (g.months[0].before.objective?.primary ?? []).map((c) => c.targetId).filter(Boolean),
      );
      for (const [key, turns] of byKey) {
        const [type, target] = key.split("|");
        const cap = type === "DIPLOMACY_IMPROVE_RELATIONS" && !primary.has(target) ? 2 : 3;
        for (const t of turns)
          expect(
            turns.filter((x) => x >= t && x < t + 6).length,
            `${g.code} ${key} from month ${t + 1}`,
          ).toBeLessThanOrEqual(cap);
      }
    }
  });
});
