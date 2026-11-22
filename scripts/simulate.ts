/**
 * Headless playtest harness: plays games end-to-end without the UI and reports
 * pacing/difficulty metrics against the design targets.
 *
 *   npm run sim -- --mode TERM --scenario 2026 --countries USA,ISR,IRN --games 12 --policy smart
 *   npm run sim -- --flashpoint hormuz-convoy --countries USA --policy smart --verbose 1
 *
 * Player policies:
 *   none: does nothing (crises fall to their default option)
 *   propaganda: a national address every month (the old dominant strategy)
 *   smart: a heuristic competent player: fixes weaknesses, courts rivals, picks good crisis options
 *   random: random affordable orders and random crisis options
 *   greedy: no orders, always the crisis option with the best-looking effects
 *   loop: the "reform / address every month" loop playtesters found, best crisis options
 *   hawk: mobilizes then attacks the main rival
 *   ai: the player's country is driven by PersonalityAI
 *   staff: autopilot ("Approve all" + Execute): cabinet picks on crises, the staff's meeting
 *     answers within the slots, the staff's proposed orders, all approved (src/core/advisors.ts;
 *     on the desk a proposal holds no political capital until approved, F-02-4)
 *   staffswitch: staff, but every cabinet pick that differs from the mission pick is switched
 *     (a player who reads the red mission tags)
 *
 *   --difficulty ANALYST|STATESMAN|STRONGMAN (default STATESMAN)
 */
import { generateDeterministicIntents } from "../src/agents/fallback.js";
import { createDataLoader } from "../src/core/data-loader.js";
import { combineSeed, SeededRandom } from "../src/core/seed.js";
import { TurnEngine } from "../src/core/turn.js";
import { decide, playerOrders, staffMonth } from "./policies.js";
import type { Difficulty, GameMode } from "../src/core/types.js";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}
const scenario = args.get("scenario") ?? "2026";
const mode = (args.get("mode") ?? "TERM") as GameMode;
const flashpointId = args.get("flashpoint");
const countries = (args.get("countries") ?? args.get("country") ?? "USA").split(",");
const games = Number(args.get("games") ?? 12);
const policies = (args.get("policy") ?? "smart").split(",");
const verbose = args.get("verbose") === "1";
const json = args.get("json") === "1";
const why = args.get("why") === "1"; // count which objective conditions fail
const difficulty = (args.get("difficulty") ?? "STATESMAN") as Difficulty;

// ----------------------------------------------------------------------------
// Reveal benchmarks (npm run bench:reveal): every seat with smart / random / none,
// scored like the end screen; writes data/benchmarks/ (see scripts/benchmark.ts)
// ----------------------------------------------------------------------------
if (args.get("benchmark") === "1") {
  const { runBenchmark } = await import("./benchmark.js");
  await runBenchmark({ args, playerOrders, decide });
  process.exit(0);
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

interface GameMetrics {
  turns: number;
  ending: string;
  victory: boolean;
  stars: number;
  finalScore: number;
  closeCalls: number;
  comebacks: number;
  turnsWithDecision: number;
  firstDecisionTurn: number;
  tensionMonths: number[];
  warnedBeforeDeposed: boolean | null;
  pcCappedMonths: number;
  pcRefusals: number;
}

const loader = createDataLoader();
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const pct = (n: number, d: number) => `${Math.round((100 * n) / Math.max(1, d))}%`;

const summary: Record<string, unknown>[] = [];
for (const policy of policies) {
  for (const country of countries) {
    const results: GameMetrics[] = [];
    const failedConditions: Record<string, number> = {};
    for (let g = 0; g < games; g++) {
      const seed = 1000 + g * 7919;
      const rng = new SeededRandom(combineSeed(seed, 99));
      let world = loader.newGame({
        scenarioId: scenario,
        playerCountryId: country,
        seed,
        mode,
        flashpointId,
        difficulty,
      });
      const engine = new TurnEngine();
      const m: GameMetrics = {
        turns: 0,
        ending: "RUNNING",
        victory: false,
        stars: 0,
        finalScore: 0,
        closeCalls: 0,
        comebacks: 0,
        turnsWithDecision: 0,
        firstDecisionTurn: -1,
        tensionMonths: [],
        warnedBeforeDeposed: null,
        pcCappedMonths: 0,
        pcRefusals: 0,
      };
      let lastWarning = -99;
      for (let t = 0; t < 130 && !world.gameOver; t++) {
        // Players who answer crises also take their meetings (the engine caps them at MEETING_SLOTS)
        const staff = policy.startsWith("staff") ? staffMonth(world, policy === "staffswitch") : null;
        const decisions = staff?.decisions ?? decide(policy, [...world.pendingDecisions, ...(process.env.NO_MEET ? [] : world.agenda.filter((m) => !process.env.MEET_KIND || m.kind === process.env.MEET_KIND).slice(0, 3))], rng, world);
        if (process.env.MEET_LOG) for (const d of decisions) { const m = world.agenda.find((x) => x.id === d.decisionId); if (m) console.error(`T${world.turn} ${m.title} -> ${m.options.find((o) => o.id === d.optionId)?.label} ${JSON.stringify(m.options.find((o) => o.id === d.optionId)?.effects)}`); }
        const result = engine.executeTurn(
          world,
          staff?.orders ?? playerOrders(policy, world, rng),
          generateDeterministicIntents(world),
          decisions,
        );
        world = result.newState;
        if (world.politicalCapital >= 6) m.pcCappedMonths++;
        m.pcRefusals += (world.turnReport?.orders ?? []).filter((o) =>
          o.detail.startsWith("Not enough political capital"),
        ).length;
        if (world.pendingDecisions.length > 0) {
          m.turnsWithDecision++;
          if (m.firstDecisionTurn < 0) m.firstDecisionTurn = world.turn;
        }
        if (world.pendingDecisions.some((d) => ["coup_plot", "streets_boiling"].includes(d.templateId)))
          lastWarning = world.turn;
        m.tensionMonths.push(world.globalTension);
        if (verbose) {
          const me = world.countries.find((c) => c.id === country);
          console.log(
            `T${world.turn} ${world.date} score=${world.score.total} appr=${me?.approval.toFixed(0)} stab=${me?.stability.toFixed(0)} pc=${world.politicalCapital} tension=${world.globalTension.toFixed(0)} | ${world.pendingDecisions.map((d) => `[${d.title}]`).join(" ")} ${world.newspaper
              .slice(0, 2)
              .map((n) => n.headline)
              .join(" · ")}`,
          );
        }
      }
      if (why) {
        for (const c of world.outcome?.conditions ?? []) {
          if (!c.met) failedConditions[c.label] = (failedConditions[c.label] ?? 0) + 1;
        }
      }
      m.turns = world.turn;
      m.ending = world.gameOver?.reason ?? "RUNNING";
      m.victory = world.outcome?.victory ?? false;
      m.stars = world.outcome?.stars ?? 0;
      m.finalScore = world.score.total;
      m.closeCalls = world.director.closeCalls;
      m.comebacks = world.director.rallies;
      if (["DEPOSED_COUP", "REVOLUTION"].includes(m.ending)) {
        m.warnedBeforeDeposed = world.turn - lastWarning <= 9;
      }
      results.push(m);
    }
    const allTension = results.flatMap((r) => r.tensionMonths);
    const endings = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.ending] = (acc[r.ending] ?? 0) + 1;
      return acc;
    }, {});
    const deposed = results.filter((r) => r.warnedBeforeDeposed !== null);
    const row = {
      policy,
      country,
      mode: flashpointId ? `FLASHPOINT:${flashpointId}` : mode,
      win: pct(results.filter((r) => r.victory).length, results.length),
      stars: (results.reduce((s, r) => s + r.stars, 0) / results.length).toFixed(2),
      medTurns: median(results.map((r) => r.turns)),
      medScore: median(results.map((r) => r.finalScore)),
      closeCall: pct(results.filter((r) => r.closeCalls > 0).length, results.length),
      winWithCloseCall: pct(
        results.filter((r) => r.victory && r.closeCalls > 0).length,
        results.filter((r) => r.victory).length,
      ),
      comebacks: (results.reduce((s, r) => s + r.comebacks, 0) / results.length).toFixed(2),
      decisionTurns: pct(
        results.reduce((s, r) => s + r.turnsWithDecision, 0),
        results.reduce((s, r) => s + r.turns, 0),
      ),
      firstDecision: median(results.map((r) => r.firstDecisionTurn)),
      tensionMedian: Math.round(median(allTension)),
      tension80: pct(allTension.filter((t) => t >= 80).length, allTension.length),
      pcCapped: pct(
        results.reduce((s, r) => s + r.pcCappedMonths, 0),
        results.reduce((s, r) => s + r.turns, 0),
      ),
      pcRefusalsPerGame: (results.reduce((s, r) => s + r.pcRefusals, 0) / results.length).toFixed(1),
      telegraphed: deposed.length ? pct(deposed.filter((r) => r.warnedBeforeDeposed).length, deposed.length) : "-",
      endings,
      ...(why ? { failed: failedConditions } : {}),
    };
    summary.push(row);
    if (!json) console.log(JSON.stringify(row));
  }
}
if (json) console.log(JSON.stringify(summary, null, 2));
