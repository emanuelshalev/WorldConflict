import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDeterministicIntents } from "../../src/agents/fallback.js";
import { createDataLoader } from "../../src/core/data-loader.js";
import {
  buildReveal,
  flashpointPrefix,
  parseSeedCode,
  presidencyScore,
  seatKeyOf,
  seedCodeOf,
} from "../../src/core/reveal.js";
import { TurnEngine } from "../../src/core/turn.js";
import type { WorldState } from "../../src/core/types.js";
import { WorldStateSchema } from "../../src/core/types.js";
import { fixtureWorld } from "../fixtures/reveal/hormuz-usa.js";

const loader = createDataLoader();
const PAYLOAD_FIXTURE = join(__dirname, "../fixtures/reveal/payload-hormuz-usa.json");

describe("Presidency Score", () => {
  it("matches the worked example computed by hand (724)", () => {
    const world = fixtureWorld();
    const p = presidencyScore(world, world.chronicle as NonNullable<WorldState["chronicle"]>);
    const parts = Object.fromEntries(p.parts.map((x) => [x.id, x.value]));
    expect(parts).toEqual({ mission: 400, timing: 50, leadership: 163, finish: 111 });
    expect(p.total).toBe(724);
    expect(p.parts.reduce((s, x) => s + x.value, 0)).toBe(p.total);
  });

  it("applies the deposition and nuclear modifiers", () => {
    const world = fixtureWorld();
    world.gameOver = { reason: "DEPOSED_COUP", description: "", turn: 8 };
    const ch = world.chronicle as NonNullable<WorldState["chronicle"]>;
    const deposed = presidencyScore(world, ch);
    expect(deposed.modifier.factor).toBe(0.6);
    expect(deposed.total).toBe(Math.round(deposed.raw * 0.6));
    world.gameOver = { reason: "NUCLEAR_HOLOCAUST", description: "", turn: 8 };
    expect(presidencyScore(world, ch).total).toBe(0);
  });

  it("weights the career total by difficulty", () => {
    const world = fixtureWorld();
    world.difficulty = "STRONGMAN";
    const p = presidencyScore(world, world.chronicle as NonNullable<WorldState["chronicle"]>);
    expect(p.career.total).toBe(Math.round(724 * 1.15));
  });
});

describe("buildReveal", () => {
  it("keeps verdict, grade and stars equal to the engine's", () => {
    const r = buildReveal(fixtureWorld());
    expect(r.verdict.victory).toBe(true);
    expect(r.verdict.stars).toBe(3);
    expect(r.verdict.label).toBe("MISSION COMPLETE");
    expect(["S", "A"]).toContain(r.verdict.grade);
    expect(r.presidency.total).toBe(724);
    expect(r.reduced).toBe(false);
  });

  it("lists moments, timing callouts, perception and numbers from the chronicle", () => {
    const r = buildReveal(fixtureWorld());
    expect(r.moments.best?.title).toBe("The shooting stops with Iran");
    expect(r.moments.worst?.title).toBe("Isfahan's tunnels");
    for (const m of [...r.moments.well, ...r.moments.bad]) expect(m.text).toMatch(/^Month \d+ · /);
    expect(r.moments.timing.length).toBeGreaterThan(0);
    expect(r.moments.timing.some((t) => /month \d+|all 12 months/.test(t.text))).toBe(true);
    expect(r.perception.press).toHaveLength(3);
    expect(r.perception.relations.length).toBeLessThanOrEqual(5);
    expect(r.perception.judgement.length).toBeGreaterThan(20);
    const approval = r.numbers.series.find((s) => s.id === "approval");
    expect(approval?.start).toBe(44);
    expect(approval?.end).toBe(61);
    expect(r.numbers.series).toHaveLength(5);
    expect(r.numbers.counts.livesLost).toBe(230);
  });

  it("orders seals good first (rarest last), then infamy, and offers two locked hints", () => {
    const r = buildReveal(fixtureWorld());
    const ids = r.achievements.earned.map((a) => a.id);
    expect(ids).toContain("clean_sheet");
    expect(ids).toContain("peacemaker");
    const firstInfamy = r.achievements.earned.findIndex((a) => a.infamy);
    if (firstInfamy >= 0) expect(r.achievements.earned.slice(firstInfamy).every((a) => a.infamy)).toBe(true);
    expect(r.achievements.locked).toHaveLength(2);
    expect(r.achievements.locked.every((a) => a.turn === null && !a.infamy)).toBe(true);
  });

  it("declassifies ground truth (nuclear, plots) only in the reveal", () => {
    const world = fixtureWorld();
    const r = buildReveal(world);
    const nuclear = r.declassified.find((d) => d.id === "nuclear");
    expect(nuclear?.actual).toBe(Math.round(world.countries.find((c) => c.id === "IRN")?.nuclear.progress ?? -1));
    expect(r.declassified.find((d) => d.id === "plots")?.actual).toBe(3);
    expect(r.declassified.length).toBeLessThanOrEqual(3);
  });

  it("builds truth rows with Better / Same / Worse / Context verdicts", () => {
    const world = fixtureWorld();
    const r = buildReveal(world, {
      sources: ["a", "b", "c"],
      reality: {
        asOf: "2026-11",
        fear: "A crash bomb programme",
        sources: [0, 2],
        rows: [
          {
            topic: "The strait",
            real: "Still shut",
            yours: { kind: "WAR_ENDED", targetId: "USA", otherId: "IRN", label: "" },
            yoursText: { met: "Reopened in month {firstMet}.", missed: "Still contested." },
            better: "met",
          },
          {
            topic: "The bomb",
            real: "No test",
            yours: { kind: "NO_NUCLEAR", targetId: "IRN", label: "No test" },
            better: "same",
          },
          {
            topic: "Approval",
            real: "Low",
            yours: { kind: "STAT_MIN", stat: "approval", min: 90, label: "Approval 90" },
            better: "met",
          },
          { topic: "Context", real: "Oil at $90", better: "context" },
        ],
      },
    });
    expect(r.truth?.rows.map((x) => x.verdict)).toEqual(["BETTER", "SAME", "WORSE", "CONTEXT"]);
    expect(r.truth?.rows[0].yours).toBe("Reopened in month 6.");
    expect(r.truth?.sources).toEqual(["a", "c"]);
    expect(r.truth?.fear).toBe("A crash bomb programme");
    expect(r.truth?.debrief).toContain("What really happened");
  });

  it("degrades to a reduced reveal for saves without a chronicle", () => {
    const world = fixtureWorld();
    world.chronicle = undefined;
    world.scoreHistory = [
      { turn: 0, gdp: 1, stability: 50, approval: 44, globalTension: 70, score: 100 },
      { turn: 1, gdp: 1, stability: 52, approval: 48, globalTension: 66, score: 104 },
    ];
    const old = WorldStateSchema.parse(JSON.parse(JSON.stringify(world)));
    const r = buildReveal(old);
    expect(r.reduced).toBe(true);
    expect(r.numbers.series[0].values).toEqual([44, 48]);
    expect(r.verdict.stars).toBe(3);
  });

  it("ranks against benchmark ticks and reports a percentile", () => {
    const q = Array.from({ length: 21 }, (_, i) => 500 + i * 15); // 500 .. 800
    const r = buildReveal(fixtureWorld(), {
      benchmarks: {
        seatKey: "hormuz-convoy:USA",
        fingerprint: "x",
        generatedAt: "2026-11-21",
        games: 21,
        difficulty: "STATESMAN",
        policies: { smart: { p10: 530, p50: 650, p90: 770, max: 800, n: 21, q } },
      },
    });
    expect(r.ranking.percentile).toBe(75);
    expect(r.ranking.ticks.map((t) => t.id)).toEqual(["smart_p50", "smart_p90", "best"]);
    expect(r.ranking.percentileLabel).toContain("75%");
  });

  it("matches the committed payload fixture the UI builds against", () => {
    const payload = buildReveal(fixtureWorld(), { saveId: "fixture" });
    const json = `${JSON.stringify(payload, null, 2)}\n`;
    if (process.env.UPDATE_FIXTURES) writeFileSync(PAYLOAD_FIXTURE, json);
    expect(JSON.parse(readFileSync(PAYLOAD_FIXTURE, "utf-8"))).toEqual(JSON.parse(json));
  });
});

describe("Seats, seed codes and replay", () => {
  it("round-trips seed codes for flashpoint and Term seats", () => {
    const fps = loader.loadAvailableFlashpoints();
    const prefixes = fps.map((f) => flashpointPrefix(f.id));
    expect(new Set(prefixes).size).toBe(prefixes.length);
    const world = fixtureWorld();
    const code = seedCodeOf(world);
    expect(code).toMatch(/^HC-USA-[0-9A-Z]+$/);
    expect(parseSeedCode(code, fps)).toEqual({
      seed: world.seed,
      playerCountryId: "USA",
      flashpointId: "hormuz-convoy",
      mode: "FLASHPOINT",
    });
    const term = { ...world, flashpointId: null, mode: "TERM" as const, scenarioId: "2026" };
    expect(seatKeyOf(term)).toBe("2026:TERM:USA");
    expect(parseSeedCode(seedCodeOf(term).toLowerCase(), fps)).toMatchObject({
      scenarioId: "2026",
      mode: "TERM",
      seed: world.seed,
    });
    expect(parseSeedCode("ZZ-USA-12", fps)).toBeNull();
    expect(parseSeedCode("nonsense", fps)).toBeNull();
  });

  it("same seed, same orders and choices (ALGORITHMIC) gives the same Presidency Score", () => {
    const play = () => {
      let w = loader.newGame({
        scenarioId: "2026",
        playerCountryId: "USA",
        seed: 777,
        flashpointId: "hormuz-convoy",
      });
      const engine = new TurnEngine();
      while (!w.gameOver) {
        const decisions = w.pendingDecisions.map((d) => ({
          decisionId: d.id,
          optionId: d.options[0].id,
        }));
        w = engine.executeTurn(
          w,
          [{ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: "IRN" }],
          generateDeterministicIntents(w),
          decisions,
        ).newState;
      }
      return buildReveal(w);
    };
    const a = play();
    const b = play();
    expect(a.presidency).toEqual(b.presidency);
    expect(a.achievements).toEqual(b.achievements);
    expect(a.run).toEqual(b.run);
    expect(a.replay.deterministic).toBe(true);
  });
});
