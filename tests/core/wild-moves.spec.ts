import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import { ceasefireChance, talksAgainTurn } from "../../src/core/systems/diplomacy.js";
import { startWar } from "../../src/core/systems/military.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Action, WorldState } from "../../src/core/types.js";
import { staffMonth } from "../../scripts/policies.js";
import { CONTROL_SEEDS, newControlWorld, playControl, UKR_CONTROL } from "../fixtures/control.js";

/**
 * F-02-3: wild moves have loud consequences (CLAUDE.md invariants). Leo, playing the Hormuz
 * Convoy as the United States, queued "Strike nuclear sites in China" in month 1: China only
 * denounced him and his approval went up. Nuclear use must bring the global embargo, the
 * retaliation risk, war, a collapse of approval and legitimacy at home, and a big moment.
 */

const loader = createDataLoader();
const step = (w: WorldState, orders: Action[] = []) =>
  new TurnEngine().executeTurn(w, orders, generateDeterministicIntents(w), []).newState;
const get = (w: WorldState, id: string) => w.countries.find((c) => c.id === id)!;

describe("a strike on a nuclear power in peacetime (Leo's month 1)", () => {
  const start = loader.newGame({
    scenarioId: "2026",
    playerCountryId: "USA",
    seed: 4,
    mode: "FLASHPOINT",
    flashpointId: "hormuz-convoy",
  });
  const after = step(start, [
    { type: "MILITARY_AIRSTRIKE", targetCountryId: "CHN", params: { targetType: "NUCLEAR" } },
  ]);
  const usa0 = get(start, "USA");
  const usa = get(after, "USA");
  const report = after.turnReport!;

  it("is answered with war, not a denunciation", () => {
    expect(get(start, "USA").atWarWith).not.toContain("CHN");
    expect(usa.atWarWith).toContain("CHN");
    expect(after.wars.some((w) => w.attackerId === "CHN" && w.defenderId === "USA")).toBe(true);
    expect(after.newspaper.some((n) => /WAR: China attacks United States/.test(n.headline))).toBe(true);
  });

  it("costs approval and legitimacy at home and shocks world tension", () => {
    expect(usa.approval).toBeLessThan(usa0.approval);
    expect(usa.legitimacy).toBeLessThan(usa0.legitimacy);
    expect(after.globalTension).toBeGreaterThan(start.globalTension + 8);
  });

  it("is a big moment, and the order says what it did: no damage to a hardened arsenal, and war", () => {
    expect(report.moments).toContain("ACT OF WAR");
    const o = report.orders.find((x) => x.type === "MILITARY_AIRSTRIKE");
    expect(o?.status).toMatch(/NO_EFFECT|FAILED/);
    expect(o?.reason).toMatch(/declaration of war/);
  });
});

describe("nuclear use", () => {
  function nuked(seed: number) {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed, mode: "TERM" });
    if (!get(w, "USA").atWarWith.includes("IRN")) startWar(w, "USA", "IRN");
    const before = structuredClone(w);
    w = step(w, [{ type: "NUCLEAR_STRIKE", targetCountryId: "IRN" } as Action]);
    return { before, after: w };
  }

  it("brings the global embargo, collapsing relations, approval and legitimacy, and a big moment", () => {
    const { before, after } = nuked(11);
    const usa0 = get(before, "USA");
    const usa = get(after, "USA");
    expect(usa.underGlobalEmbargo).toBe(true);
    expect(usa.approval).toBeLessThanOrEqual(usa0.approval - 15);
    expect(usa.legitimacy).toBeLessThanOrEqual(usa0.legitimacy - 10);
    // Every state turns on the striker, friends included
    expect(get(after, "GBR").relations.USA).toBeLessThan(get(before, "GBR").relations.USA - 40);
    expect(after.globalTension).toBeGreaterThan(before.globalTension + 15);
    expect(after.turnReport?.moments).toContain("NUCLEAR STRIKE");
    expect(after.turnReport?.causes.some((c) => /nuclear weapon/.test(c))).toBe(true);
    expect(after.newspaper[0]?.category).toBe("NUCLEAR");
    const o = after.turnReport?.orders.find((x) => x.type === "NUCLEAR_STRIKE");
    expect(o?.status).toBe("DONE");
  });

  it("striking a nuclear-armed enemy brings retaliation and the end of the world", () => {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed: 3, mode: "TERM" });
    startWar(w, "USA", "CHN");
    w = step(w, [{ type: "NUCLEAR_STRIKE", targetCountryId: "CHN" } as Action]);
    expect(w.gameOver?.reason).toBe("NUCLEAR_HOLOCAUST");
  });
});

// QA3R-3h: one Propose ceasefire a month ended the Ukraine war in month 3 at a stalemate on all
// three Ukraine control seeds (the chance was rolled again every month with no memory). A side
// that refuses does not talk again for REFUSAL_MEMORY months; after the pause the odds are full.
describe("a ceasefire offer every month does not end a stalemate by repetition (QA3R-3h)", () => {
  const war = (w: WorldState) =>
    w.wars.find((x) => [x.attackerId, x.defenderId].sort().join() === "RUS,UKR");
  it("Ukraine control seeds, an offer to Russia every month: no end before month 6 at a front of 40 to 60", () => {
    let ended = 0;
    for (const code of UKR_CONTROL) {
      const g = playControl(code, "cease");
      for (const m of g.months) {
        const before = war(m.before);
        if (!before || war(m.after)) continue;
        ended += 1;
        const front = before.frontline;
        if (front >= 40 && front <= 60)
          expect(m.before.turn + 1, `${code}: ended in month ${m.before.turn + 1} at ${front}`).toBeGreaterThanOrEqual(6);
      }
    }
    // Still achievable: persistence ends the war within the year on at least one seed
    expect(ended).toBeGreaterThanOrEqual(1);
  });

  it("after a refusal the other side will not talk for two months, then the odds are back", () => {
    const w = playControl("CO-UKR-PRIY1", "none", 1).months[0].before;
    const x = structuredClone(war(w)!);
    const ukr = get(w, "UKR");
    const rus = get(w, "RUS");
    const full = ceasefireChance(x, ukr, rus, 5);
    expect(full).toBeGreaterThan(0);
    x.refusedTurns = [4];
    expect(ceasefireChance(x, ukr, rus, 5)).toBe(0);
    expect(ceasefireChance(x, ukr, rus, 6)).toBe(0);
    expect(ceasefireChance(x, ukr, rus, 7)).toBeCloseTo(full);
    expect(talksAgainTurn(x)).toBe(7);
    // The winner who can dictate terms still takes a peace at once
    const lost = { ...x, frontline: x.attackerId === "RUS" ? 95 : 5 };
    expect(ceasefireChance(lost, ukr, rus, 5)).toBeGreaterThan(0);
  });
});

/**
 * F-04-7 (iteration 4 customer round, REGRESSED F-02-3): the player's act of war is the story of
 * the month. Leo (QU-CHN-LEO01) declared war on Taiwan in month 8 and the result card led with a
 * Japanese ultimatum answer; his "Strike first" crisis answer was led by a Belarus treaty; Dan's
 * strike on Turkey shared the month with Erdogan's warm call. A declaration of war, an airstrike
 * or a nuclear strike (an order, or a crisis answer that sets one off) leads yourMove, the
 * highlight and the paper, and the country it hit never answers a call warmly that month.
 */
describe("F-04-7: the player's act of war leads the result card and the paper", () => {
  const ACTS = new Set(["DIPLOMACY_DECLARE_WAR", "MILITARY_AIRSTRIKE", "NUCLEAR_STRIKE"]);
  const engine = new TurnEngine();

  /** Play `code` on the chief's month up to month `upTo` (1-based), then the month with `extra` orders and `swap` answers. */
  function month(code: string, upTo: number, extra: Action[] = [], swap: Record<string, string> = {}) {
    let w = newControlWorld(code);
    for (let t = 1; t < upTo && !w.gameOver; t++) {
      const s = staffMonth(w, "chief");
      w = engine.executeTurn(w, s.orders, generateDeterministicIntents(w), s.decisions).newState;
    }
    const s = staffMonth(w, "chief");
    const decisions = s.decisions.filter((d) => !(d.decisionId in swap));
    for (const [decisionId, optionId] of Object.entries(swap)) decisions.push({ decisionId, optionId });
    const after = engine.executeTurn(w, [...s.orders, ...extra], generateDeterministicIntents(w), decisions).newState;
    return { before: w, after, report: after.turnReport! };
  }

  /** A warm reply from the leader of a country the player struck this month (a call or a visit;
   *  a crisis answer's reaction is a voice at home). */
  function warmFromStruck(report: NonNullable<WorldState["turnReport"]>, struck: string[]) {
    return report.decisions.filter(
      (d) =>
        d.kind !== "CRISIS" && d.withCountry && struck.includes(d.withCountry) && d.attended !== false && d.reaction?.tone === "warm",
    );
  }

  it("F-04-7: Leo month 8, Declare war on Taiwan leads yourMove, the highlight and the paper", () => {
    const { after, report } = month("QU-CHN-LEO01", 8, [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: "TWN" }]);
    const i = report.orders.findIndex((o) => o.type === "DIPLOMACY_DECLARE_WAR");
    expect(report.orders[i]?.status).not.toBe("REFUSED");
    expect(report.yourMove, JSON.stringify(report.decisions.map((d) => d.choice))).toEqual({ ref: "order", index: i });
    expect(report.highlight).toEqual({ ref: "order", index: i });
    const lead = after.newspaper.find((n) => n.relatedCountries.includes("CHN"));
    expect(lead?.headline).toMatch(/Taiwan|TAIWAN|war|WAR/);
    expect(lead?.relatedCountries).toContain("TWN");
    expect(warmFromStruck(report, ["TWN"])).toEqual([]);
  });

  it("F-04-7: Dan month 12, an airstrike on Turkey leads, and Erdogan does not answer warmly", () => {
    const { report } = month("T2026-RUS-DAN01", 12, [
      { type: "MILITARY_AIRSTRIKE", targetCountryId: "TUR", params: { targetType: "NUCLEAR" } },
    ]);
    const i = report.orders.findIndex((o) => o.type === "MILITARY_AIRSTRIKE");
    expect(report.orders[i]?.status).not.toBe("REFUSED");
    expect(report.yourMove).toEqual({ ref: "order", index: i });
    expect(warmFromStruck(report, ["TUR"])).toEqual([]);
  });

  it("F-04-7: you take a leader's call and strike their country the same month: the strike leads, the call is not warm", () => {
    let checked = 0;
    for (const code of CONTROL_SEEDS) {
      let w = newControlWorld(code);
      for (let t = 0; t < 12 && !w.gameOver; t++) {
        const s = staffMonth(w, "chief");
        const call = w.agenda.find(
          (m) =>
            (m.kind === "CALL" || m.kind === "VISIT") &&
            m.withCountry &&
            m.withCountry !== w.playerCountryId &&
            s.decisions.some((d) => d.decisionId === m.id),
        );
        if (call?.withCountry) {
          const strike: Action = { type: "MILITARY_AIRSTRIKE", targetCountryId: call.withCountry, params: { targetType: "MILITARY" } };
          const after = engine.executeTurn(w, [...s.orders, strike], generateDeterministicIntents(w), s.decisions).newState;
          const report = after.turnReport!;
          const i = report.orders.findIndex((o) => o.type === "MILITARY_AIRSTRIKE");
          if (i >= 0 && report.orders[i].status !== "REFUSED") {
            const at = `${code} month ${t + 1}, strike on ${call.withCountry} after "${call.title}"`;
            expect(report.yourMove, at).toEqual({ ref: "order", index: i });
            const warm = warmFromStruck(report, [call.withCountry]);
            expect(warm.map((x) => `${x.headline}: ${x.reaction?.line}`), at).toEqual([]);
            checked++;
            break;
          }
        }
        w = engine.executeTurn(w, s.orders, generateDeterministicIntents(w), s.decisions).newState;
      }
    }
    expect(checked, "control seeds with a call and a strike on its country").toBeGreaterThanOrEqual(4);
  });

  it("F-04-7: a crisis answer that sets off a strike or a war leads yourMove (control seeds, Choose all and chief, 12 months)", () => {
    let checked = 0;
    // staff is Choose all recommended (Leo, QU-CHN-LEO01 month 6: Strike first was led by Sign the treaty)
    for (const policy of ["staff", "chief"])
    for (const code of CONTROL_SEEDS) {
      let w = newControlWorld(code);
      for (let t = 0; t < 12 && !w.gameOver; t++) {
        const s = staffMonth(w, policy);
        for (const d of w.pendingDecisions) {
          const opt = d.options.find((o) => o.actions.some((a) => ACTS.has(a.type)));
          if (!opt) continue;
          const decisions = [...s.decisions.filter((x) => x.decisionId !== d.id), { decisionId: d.id, optionId: opt.id }];
          const after = engine.executeTurn(w, s.orders, generateDeterministicIntents(w), decisions).newState;
          const report = after.turnReport!;
          const di = report.decisions.findIndex((x) => x.optionId === opt.id && x.title === d.title);
          const struck = opt.actions.filter((a) => ACTS.has(a.type)).map((a) => a.targetCountryId ?? "");
          // the injected act ran (not refused by the engine): the answer is the month's move
          const ran = report.decisions[di]?.status !== "FAILED";
          if (!ran) continue;
          const at = `${policy} ${code} month ${t + 1} "${d.title}: ${opt.label}" (yourMove ${JSON.stringify(report.yourMove)}, decisions ${report.decisions.map((x) => x.choice).join(" | ")})`;
          expect(report.yourMove, at).toEqual({ ref: "decision", index: di });
          expect(warmFromStruck(report, struck).map((x) => `${x.kind} ${x.withCountry} ${x.choice}: ${x.reaction?.who} ${x.reaction?.line}`), at).toEqual([]);
          checked++;
        }
        w = engine.executeTurn(w, s.orders, generateDeterministicIntents(w), s.decisions).newState;
      }
    }
    expect(checked, "crisis answers that strike or declare war on the control seeds").toBeGreaterThanOrEqual(5);
  });
});

/**
 * F-04-2 (iteration 4 customer round, REGRESSED F-02-2 and D84-DESK-TRUTH): Noah (HC-ARE-NOAH1)
 * pressed Execute with nothing chosen; three months in six read "A quiet month: the world moved
 * on its own" while a crisis ran on its default and moved his approval. A crisis left open is the
 * player's move of the month when nothing else was chosen: yourMove names it (the result card's
 * "Left open" line), never empty and never a war front.
 */
describe("F-04-2: an Execute with nothing chosen reports the crisis left open", () => {
  it("F-04-2: HC-ARE-NOAH1, 6 months of Execute alone: a month whose crisis ran on its default leads with it", () => {
    const engine = new TurnEngine();
    let w = newControlWorld("HC-ARE-NOAH1");
    let checked = 0;
    for (let t = 0; t < 6 && !w.gameOver; t++) {
      w = engine.executeTurn(w, [], generateDeterministicIntents(w), []).newState;
      const report = w.turnReport!;
      const ran = report.decisions.filter((d) => d.kind === "CRISIS" && /\(no decision taken\)$/.test(d.choice));
      if (!ran.length) continue;
      const at = `month ${t + 1}: ${report.decisions.map((d) => d.choice).join(" | ")}`;
      expect(report.yourMove, at).toBeDefined();
      expect(report.yourMove?.ref, at).toBe("decision");
      const d = report.decisions[report.yourMove?.index ?? -1];
      expect(d?.kind, at).toBe("CRISIS");
      expect(d?.choice, at).toMatch(/\(no decision taken\)$/);
      checked++;
    }
    expect(checked, "months 3, 4, 5 and 6 of Noah's run").toBeGreaterThanOrEqual(3);
  });
});
