import { describe, expect, it } from "vitest";
import { decide, playerOrders } from "../../scripts/policies.js";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { ATTACK_CHOICE, DEPOSED_REASONS, SHOTS } from "../../src/core/achievements.js";
import { createDataLoader, type DataLoader } from "../../src/core/data-loader.js";
import { computeOutcome, evaluateCondition, objectiveStatus } from "../../src/core/objectives.js";
import { emptyChronicle } from "../../src/core/chronicle.js";
import { buildReveal, presidencyScore, type RevealPayload } from "../../src/core/reveal.js";
import { combineSeed, SeededRandom } from "../../src/core/seed.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { Chronicle, WorldState } from "../../src/core/types.js";
import { FLASHPOINT_CONTROL, playControl } from "../fixtures/control.js";

/**
 * F-01-2: the end-of-game reveal must never contradict play. Plays finished sessions with the
 * harness's own policies (smart, random, none) on several seats and checks that every claim the
 * reveal makes agrees with the record it came from: seals with the chronicle, truth-table verdicts
 * with the objective status, the verdict's words with victory, stars and grade.
 */

const SEATS = [
  { flashpointId: "hormuz-convoy", country: "USA" },
  { flashpointId: "ceasefire-or-collapse", country: "UKR" },
  { flashpointId: "ceasefire-or-collapse", country: "USA" },
  { flashpointId: "bab-al-mandab-burning", country: "SAU" },
  { flashpointId: "water-war", country: "PAK" },
];
const POLICIES = ["smart", "random", "none"];
const SEEDS = [1000, 8919];
const PRAISE = new Set([
  "Master Diplomat",
  "Peacemaker",
  "Pragmatic Stabilizer",
  "The Reformer",
  "The Showman",
  "Steady Hand",
  "Risk-Taking Expansionist",
  "Loyal Ally",
]);
const WIN_LABELS = new Set(["MISSION COMPLETE", "FOUR MORE YEARS", "REVIEW PASSED", "A DECADE IN POWER"]);

interface Played {
  key: string;
  world: WorldState;
  reveal: RevealPayload;
}

function play(loader: DataLoader, flashpointId: string, country: string, policy: string, seed: number): Played {
  const rng = new SeededRandom(combineSeed(seed, 99));
  let world = loader.newGame({ scenarioId: "2026", playerCountryId: country, seed, mode: "FLASHPOINT", flashpointId, difficulty: "STATESMAN" });
  const engine = new TurnEngine();
  for (let t = 0; t < 40 && !world.gameOver; t++) {
    const decisions = decide(policy, [...world.pendingDecisions, ...world.agenda.slice(0, 3)], rng, world);
    world = engine.executeTurn(world, playerOrders(policy, world, rng), generateDeterministicIntents(world), decisions).newState;
  }
  const fp = loader.loadFlashpoint(flashpointId);
  const side = fp.objectives[country];
  const reveal = buildReveal(world, {
    reality: side?.reality ?? null,
    signature: side?.signature ?? null,
    sources: fp.sources ?? [],
    seatDifficulty: fp.playable.find((p) => p.countryId === country)?.difficulty ?? null,
  });
  return { key: `${flashpointId}:${country}:${policy}:${seed}`, world, reveal };
}

const loader = createDataLoader();
const games: Played[] = [];
for (const s of SEATS) for (const p of POLICIES) for (const seed of SEEDS) games.push(play(loader, s.flashpointId, s.country, p, seed));

const earned = (g: Played, id: string) => g.reveal.achievements.earned.some((a) => a.id === id);
const chron = (g: Played) => g.world.chronicle as Chronicle;

describe("reveal consistency over simulated games", () => {
  it("played finished sessions across policies, wins and losses", () => {
    expect(games.every((g) => g.world.gameOver)).toBe(true);
    expect(games.some((g) => g.reveal.verdict.victory)).toBe(true);
    expect(games.some((g) => !g.reveal.verdict.victory)).toBe(true);
  });

  it("seals agree with the chronicle", () => {
    for (const g of games) {
      const ch = chron(g);
      const rec = g.world.director.record ?? {};
      const crisisChoices = ch.moments.filter((m) => m.kind === "CRISIS").map((m) => m.choice ?? "");
      if (earned(g, "no_shot_fired")) {
        expect(SHOTS.every((k) => !rec[k] && !rec[`${k}:tried`]), g.key).toBe(true);
        expect(ch.series.every((s) => s.playerWars === 0), g.key).toBe(true);
        expect(ch.moments.some((m) => m.kind === "WAR_START" || m.kind === "WAR_END"), g.key).toBe(false);
        expect(crisisChoices.filter((c) => ATTACK_CHOICE.test(c) && !/\bno\s+(\w+\s+)?strikes?/i.test(c)), g.key).toEqual([]);
      }
      if (earned(g, "peacemaker")) expect(ch.moments.some((m) => m.kind === "WAR_END" && m.detail === "Ceasefire"), g.key).toBe(true);
      expect(earned(g, "the_hawk"), g.key).toBe((rec.DIPLOMACY_DECLARE_WAR ?? 0) > 0);
      if (earned(g, "coalition")) expect(ch.moments.some((m) => m.kind === "PACT"), g.key).toBe(true);
      expect(earned(g, "dealmaker"), g.key).toBe(ch.deals >= 3);
      if (earned(g, "iron_approval")) expect(Math.min(...ch.series.map((s) => s.approval)), g.key).toBeGreaterThanOrEqual(40);
      if (earned(g, "landslide")) expect(g.reveal.perception.approval.end, g.key).toBeGreaterThanOrEqual(65);
      if (earned(g, "clean_sheet")) expect((g.world.outcome?.conditions ?? []).every((c) => c.met), g.key).toBe(true);
      expect(earned(g, "deposed"), g.key).toBe(DEPOSED_REASONS.includes(g.world.gameOver?.reason ?? ""));
      // Every ceasefire you were party to is a deal on the numbers page
      const ceasefires = ch.moments.filter((m) => m.kind === "WAR_END" && m.detail === "Ceasefire").length;
      expect(g.reveal.numbers.counts.deals, g.key).toBeGreaterThanOrEqual(ceasefires);
    }
  });

  it("truth-table verdicts agree with the objective status", () => {
    const fps = new Map(SEATS.map((s) => [s.flashpointId, loader.loadFlashpoint(s.flashpointId)]));
    for (const g of games) {
      const rows = fps.get(g.world.flashpointId ?? "")?.objectives[g.world.playerCountryId]?.reality?.rows ?? [];
      const truth = g.reveal.truth?.rows ?? [];
      rows.forEach((row, i) => {
        const shown = truth[i];
        if (!row.yours || row.better === "context") return expect(shown.met, g.key).toBeNull();
        const met = evaluateCondition(g.world, row.yours, false).met;
        expect(shown.met, `${g.key} ${row.topic}`).toBe(met);
        // The same condition as a mission goal must read the same way on the verdict
        const goal = g.world.objective?.primary.find((c) => c.kind === row.yours?.kind && c.targetId === row.yours?.targetId && (c.otherId ?? "") === (row.yours?.otherId ?? "") && (c.min ?? null) === (row.yours?.min ?? null));
        const status = goal ? g.reveal.verdict.conditions.find((c) => c.label === goal.label) : undefined;
        if (status) expect(status.met, `${g.key} ${row.topic}`).toBe(met);
        // A peace row never says "no peace" flatly after the player chose a ceasefire
        if (!met && row.yours.kind === "WAR_ENDED" && chron(g).moments.some((m) => m.kind === "CRISIS" && /ceasefire|truce/i.test(m.choice ?? "")))
          expect(shown.yours, g.key).not.toBe(row.yoursText?.missed);
      });
    }
  });

  it("the verdict's words agree with victory, stars and grade", () => {
    for (const g of games) {
      const v = g.reveal.verdict;
      expect(WIN_LABELS.has(v.label), g.key).toBe(v.victory);
      if (v.victory) {
        expect(["S", "A", "B", "C"], g.key).toContain(v.grade);
        expect(v.stars, g.key).toBeGreaterThanOrEqual(1);
        expect(v.missedLine, g.key).toBeNull();
        expect(g.reveal.perception.judgement, g.key).toMatch(/proved right|stronger for it/);
      } else {
        expect(["D", "F"], g.key).toContain(v.grade);
        expect(v.stars, g.key).toBe(0);
        // A failed run never wears a praise title, and says what it missed and by how much
        expect(PRAISE.has(v.classification), `${g.key} ${v.classification}`).toBe(false);
        expect(v.missedLine, g.key).toBeTruthy();
        const first = v.missed?.[0];
        if (first && !DEPOSED_REASONS.includes(v.reason ?? "")) {
          expect(v.missedLine, g.key).toContain(first.short);
          if (first.gap !== null) expect(v.missedLine, g.key).toMatch(/ by \d/);
        }
        expect(g.reveal.perception.judgement, g.key).not.toMatch(/proved right|stronger for it/);
        expect(g.reveal.beatNext, g.key).toMatch(/^Win first: /);
      }
    }
  });

  it("start values come from the take-office snapshot, and the press agrees with the chart", () => {
    for (const g of games) {
      const start = chron(g).start;
      const a = g.reveal.perception.approval;
      expect(a.start, g.key).toBe(Math.round(start?.approval ?? Number.NaN));
      expect(g.reveal.perception.caption, g.key).toContain(`Started at ${a.start}%`);
      const home = g.reveal.perception.press.find((p) => p.role === "home")?.quote ?? "";
      const from = /from (\d+)%/i.exec(home);
      if (from) expect(Number(from[1]), g.key).toBe(a.start);
      const tension = g.reveal.numbers.series.find((s) => s.id === "tension");
      expect(tension?.start, g.key).toBe(Math.round(start?.tension ?? Number.NaN));
      expect(g.reveal.numbers.series.find((s) => s.id === "score")?.label, g.key).toBe("Score");
    }
  });
});

describe("reported cases (iteration 1 panel)", () => {
  it("Maya: Sign the ceasefire at the signing table ends the war, and the truth table says so", () => {
    const fp = loader.loadFlashpoint("ceasefire-or-collapse");
    const table = fp.scripted.UKR.find((c) => c.templateId === "ua_signing_table");
    const sign = table?.decision.options.find((o) => o.id === "sign");
    // Moscow "has signalled it will sign": the answer ends the war, it does not just propose
    expect(sign?.effects["ceasefire:RUS"]).toBe(1);
    expect(sign?.actions.some((a) => a.type === "DIPLOMACY_PROPOSE_CEASEFIRE")).toBe(false);
    let reached = 0;
    for (const seed of [...SEEDS, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000]) {
      const rng = new SeededRandom(combineSeed(seed, 99));
      let world = loader.newGame({ scenarioId: "2026", playerCountryId: "UKR", seed, mode: "FLASHPOINT", flashpointId: "ceasefire-or-collapse", difficulty: "STATESMAN" });
      const engine = new TurnEngine();
      let signed = false;
      for (let t = 0; t < 20 && !world.gameOver; t++) {
        const pending = world.pendingDecisions.find((d) => d.templateId === "ua_signing_table");
        const decisions = pending ? [{ decisionId: pending.id, optionId: "sign" }] : decide("none", world.pendingDecisions, rng, world);
        world = engine.executeTurn(world, [], generateDeterministicIntents(world), decisions).newState;
        if (pending) {
          signed = true;
          expect(world.wars.some((w) => [w.attackerId, w.defenderId].includes("RUS") && [w.attackerId, w.defenderId].includes("UKR"))).toBe(false);
        }
      }
      if (!signed) continue; // the war ended before month 11 on this seed
      reached++;
      const r = buildReveal(world, { reality: fp.objectives.UKR?.reality ?? null });
      expect(r.truth?.rows.find((x) => x.topic === "The peace")?.met).toBe(true);
      expect(r.numbers.counts.deals).toBeGreaterThanOrEqual(1);
    }
    expect(reached).toBeGreaterThan(0);
  });

  it("the truth table names the ceasefire you chose when the other side did not sign", () => {
    const g = games.find((x) => x.key.startsWith("ceasefire-or-collapse:UKR:") && x.reveal.truth?.rows.find((r) => r.topic === "The peace")?.met === false);
    expect(g).toBeDefined();
    if (!g) return;
    const world = structuredClone(g.world);
    (world.chronicle as Chronicle).moments.push({ turn: 10, kind: "CRISIS", title: "The signing table", detail: "", tone: "neutral", weight: 0, choice: "Sign the ceasefire" });
    const fp = loader.loadFlashpoint("ceasefire-or-collapse");
    const r = buildReveal(world, { reality: fp.objectives.UKR?.reality ?? null });
    expect(r.truth?.rows.find((x) => x.topic === "The peace")?.yours).toMatch(/Sign the ceasefire.*month 11.*did not sign/);
  });

  it("Maya: Never Fired a Shot is not earned at war or after an attacking crisis answer", () => {
    // Any finished game that earns the seal once every trace of war and attack is removed
    // (the seal also needs a long enough session, so a fixed seat would be brittle).
    const strip = (src: Played["world"]) => {
      const w = structuredClone(src);
      const c = w.chronicle as Chronicle;
      c.moments = c.moments.filter((m) => m.kind !== "WAR_START" && m.kind !== "WAR_END" && !(m.kind === "CRISIS" && m.choice));
      for (const s of c.series) s.playerWars = 0;
      w.director.record = {};
      return w;
    };
    const earns = (w: Played["world"]) => buildReveal(w, {}).achievements.earned.some((a) => a.id === "no_shot_fired");
    const g = games.find((x) => earns(strip(x.world)));
    expect(g).toBeDefined();
    if (!g) return;
    const world = strip(g.world);
    const ch = world.chronicle as Chronicle;
    expect(earns(world)).toBe(true);
    ch.moments.push({ turn: 2, kind: "CRISIS", title: "Blackout winter", detail: "", tone: "neutral", weight: 0, choice: "Burn their refineries" });
    expect(buildReveal(world, {}).achievements.earned.some((a) => a.id === "no_shot_fired")).toBe(false);
    ch.moments.pop();
    ch.series[3].playerWars = 1;
    expect(buildReveal(world, {}).achievements.earned.some((a) => a.id === "no_shot_fired")).toBe(false);
  });

  it("Noah: a mission lost by one point is So Close, with the miss in numbers, never Master Diplomat", () => {
    const g = games.find((x) => !x.reveal.verdict.victory && !DEPOSED_REASONS.includes(x.reveal.verdict.reason ?? "") && x.reveal.verdict.missed?.length === 1 && x.reveal.verdict.missed[0].gap !== null);
    expect(g).toBeDefined();
    if (!g) return;
    const world = structuredClone(g.world);
    const goal = (world.objective?.primary ?? []).find((c) => !evaluateCondition(world, c, false).met);
    const me = world.countries.find((c) => c.id === world.playerCountryId);
    expect(goal && me).toBeTruthy();
    if (!me || !goal) return;
    // Exactly one point short, with the standing abroad that used to earn "Master Diplomat"
    if (goal.kind === "RELATION_MIN") me.relations[goal.targetId ?? ""] = (goal.min ?? 0) - 1;
    else if (goal.kind === "STAT_MIN") me[goal.stat ?? "approval"] = (goal.min ?? 50) - 1;
    else if (goal.kind === "SCORE_PAR") world.score.total = (goal.min ?? 100) - 1;
    world.score.prestige = 40;
    const r = buildReveal(world, {});
    expect(r.verdict.victory).toBe(false);
    expect(r.verdict.classification).toBe("So Close");
    expect(r.verdict.missedLine).toMatch(/ by 1\b/);
  });
});

// QA3R-2b, QA3R-2c (F-01-2): the verdict counted "Stay in power" as a goal (5 of 5 where the desk
// said 4 of 4), and the Finish line said "par 115" beside a mission goal of 120.
describe("the reveal counts goals like the desk and names the score goal (QA3R-2b, 2c)", () => {
  it("control seeds: the Mission line counts the desk's goals", () => {
    for (const code of FLASHPOINT_CONTROL) {
      const g = playControl(code, "staff");
      const w = g.final;
      if (!w.gameOver) continue;
      const r = buildReveal(w);
      const mission = r.presidency.parts.find((p) => p.id === "mission")!;
      const desk = objectiveStatus(w).filter((s) => !s.bonus).length;
      const m = mission.detail.match(/(\d+) of (\d+) goals/);
      expect(m?.[2], `${code}: ${mission.detail}`).toBe(String(desk));
    }
  });

  it("every flashpoint seat: the Finish line names the mission's score goal when it is not par", () => {
    const loader = createDataLoader();
    for (const fp of loader.loadAvailableFlashpoints())
      for (const { countryId: side } of fp.playable) {
        const w = loader.newGame({
          scenarioId: fp.scenarioId,
          playerCountryId: side,
          seed: 7,
          mode: "FLASHPOINT",
          flashpointId: fp.id,
        });
        w.outcome = computeOutcome(w);
        const ps = presidencyScore(w, emptyChronicle());
        const finish = ps.parts.find((p) => p.id === "finish")!.detail;
        const goal = w.objective?.primary.find((c) => c.kind === "SCORE_PAR")?.min;
        const par = w.objective?.par ?? 100;
        expect(finish, `${fp.id} ${side}`).toContain(`par ${par}`);
        if (goal !== undefined && goal !== par)
          expect(finish, `${fp.id} ${side}`).toContain(`goal was ${goal}+`);
        const mission = ps.parts.find((p) => p.id === "mission")!.detail;
        const desk = objectiveStatus(w).filter((s) => !s.bonus).length;
        expect(mission, `${fp.id} ${side}`).toMatch(new RegExp(`of ${desk} goals`));
      }
  });
});
