/**
 * Reveal benchmarks: plays every seat with the smart / random / none staff policies, scores each
 * finished game with the same buildReveal code the end screen uses, and writes
 *   data/benchmarks/<seat>.json      { seatKey, fingerprint, games, policies: { smart: {p10,p50,p90,max,n,q} } }
 *   data/benchmarks/achievements.json { fingerprint, games, rates: { FLASHPOINT: { id: share } } }
 *
 *   npm run bench:reveal                          (flashpoint seats + 2026 Term seats, 36 games)
 *   npm run sim -- --benchmark 1 --modes FLASHPOINT --games 12
 *   npm run sim -- --benchmark 1 --seats hormuz-convoy:USA,2026:TERM:USA
 *
 * Called from scripts/simulate.ts, which owns the player policies.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateDeterministicIntents } from "../src/agents/fallback.js";
import { createDataLoader, type FlashpointData } from "../src/core/data-loader.js";
import {
  type AchievementRarity,
  type BenchmarkStats,
  buildReveal,
  type SeatBenchmark,
  seatFileName,
} from "../src/core/reveal.js";
import { combineSeed, SeededRandom } from "../src/core/seed.js";
import { TurnEngine } from "../src/core/turn.js";
import type {
  Action,
  DecisionOption,
  GameMode,
  PendingDecision,
  WorldState,
} from "../src/core/types.js";
import { TIER1_COUNTRIES } from "../src/core/types.js";
import {
  BENCHMARK_DIFFICULTY,
  BENCHMARK_POLICIES,
  benchmarkFingerprint,
  benchmarksDir,
} from "../src/infra/benchmarks.js";

export interface BenchmarkDeps {
  args: Map<string, string>;
  playerOrders: (policy: string, world: WorldState, rng: SeededRandom) => Action[];
  decide: (
    policy: string,
    decisions: PendingDecision[],
    rng: SeededRandom,
    world: WorldState,
  ) => Array<{ decisionId: string; optionId: DecisionOption["id"] }>;
}

interface Seat {
  seatKey: string;
  mode: GameMode;
  scenarioId: string;
  countryId: string;
  flashpoint?: FlashpointData;
}

function quantiles(scores: number[]): BenchmarkStats {
  const s = [...scores].sort((a, b) => a - b);
  const at = (p: number) => s[Math.round(p * (s.length - 1))] ?? 0;
  return {
    p10: at(0.1),
    p50: at(0.5),
    p90: at(0.9),
    max: s.at(-1) ?? 0,
    n: s.length,
    q: Array.from({ length: 21 }, (_, i) => at(i / 20)),
  };
}

export async function runBenchmark({ args, playerOrders, decide }: BenchmarkDeps): Promise<void> {
  const loader = createDataLoader();
  const root = process.cwd();
  const games = Number(args.get("games") ?? 36);
  const modes = (args.get("modes") ?? "FLASHPOINT,TERM").split(",") as GameMode[];
  const scenario = args.get("scenario") ?? "2026";
  const only = args.get("seats")?.split(",");
  const fingerprint = benchmarkFingerprint(root);
  const generatedAt = new Date().toISOString().slice(0, 10);

  const seats: Seat[] = [];
  if (modes.includes("FLASHPOINT"))
    for (const fp of loader.loadAvailableFlashpoints())
      for (const p of fp.playable)
        seats.push({
          seatKey: `${fp.id}:${p.countryId}`,
          mode: "FLASHPOINT",
          scenarioId: fp.scenarioId,
          countryId: p.countryId,
          flashpoint: fp,
        });
  for (const mode of modes.filter((m) => m !== "FLASHPOINT"))
    for (const id of TIER1_COUNTRIES)
      seats.push({ seatKey: `${scenario}:${mode}:${id}`, mode, scenarioId: scenario, countryId: id });

  const earned: Partial<Record<GameMode, Record<string, number>>> = {};
  const played: Partial<Record<GameMode, number>> = {};
  const sigEarned: Record<string, number> = {};
  const sigPlayed: Record<string, number> = {};
  const out = benchmarksDir(root);
  mkdirSync(out, { recursive: true });

  for (const seat of seats) {
    if (only && !only.includes(seat.seatKey)) continue;
    const side = seat.flashpoint?.objectives[seat.countryId];
    const policies: SeatBenchmark["policies"] = {};
    for (const policy of BENCHMARK_POLICIES) {
      const scores: number[] = [];
      for (let g = 0; g < games; g++) {
        const seed = 1000 + g * 7919;
        const rng = new SeededRandom(combineSeed(seed, 99));
        let world = loader.newGame({
          scenarioId: seat.scenarioId,
          playerCountryId: seat.countryId,
          seed,
          mode: seat.mode,
          difficulty: BENCHMARK_DIFFICULTY,
          flashpointId: seat.flashpoint?.id,
        });
        const engine = new TurnEngine();
        for (let t = 0; t < 130 && !world.gameOver; t++) {
          const decisions = decide(
            policy,
            [...world.pendingDecisions, ...world.agenda.slice(0, 3)],
            rng,
            world,
          );
          world = engine.executeTurn(
            world,
            playerOrders(policy, world, rng),
            generateDeterministicIntents(world),
            decisions,
          ).newState;
        }
        const reveal = buildReveal(world, {
          reality: side?.reality ?? null,
          signature: side?.signature ?? null,
          sources: seat.flashpoint?.sources ?? [],
          seatDifficulty:
            seat.flashpoint?.playable.find((p) => p.countryId === seat.countryId)?.difficulty ??
            null,
        });
        scores.push(reveal.presidency.total);
        const rates = (earned[seat.mode] ??= {});
        for (const a of reveal.achievements.earned) {
          // A signature can only be earned on its own seat: its rate is per seat
          if (a.signature) sigEarned[a.id] = (sigEarned[a.id] ?? 0) + 1;
          else rates[a.id] = (rates[a.id] ?? 0) + 1;
        }
        if (side?.signature) sigPlayed[side.signature.id] = (sigPlayed[side.signature.id] ?? 0) + 1;
        played[seat.mode] = (played[seat.mode] ?? 0) + 1;
      }
      policies[policy] = quantiles(scores);
    }
    const file: SeatBenchmark = {
      seatKey: seat.seatKey,
      fingerprint,
      generatedAt,
      games,
      difficulty: BENCHMARK_DIFFICULTY,
      policies,
    };
    writeFileSync(join(out, seatFileName(seat.seatKey)), `${JSON.stringify(file, null, 2)}\n`);
    console.log(
      `${seat.seatKey.padEnd(36)} ${BENCHMARK_POLICIES.map((p) => `${p} p50 ${policies[p]?.p50} p90 ${policies[p]?.p90}`).join(" | ")}`,
    );
  }

  if (!only) {
    const round = (v: number) => Math.round(v * 1000) / 1000;
    const flash = (earned.FLASHPOINT ??= {});
    const flashGames = played.FLASHPOINT ?? 0;
    // Scaled to the pooled count so the shared division below yields the per-seat rate
    for (const [id, n] of Object.entries(sigPlayed))
      flash[id] = flashGames ? round(((sigEarned[id] ?? 0) / n) * flashGames) : 0;
    const rarity: AchievementRarity = {
      fingerprint,
      generatedAt,
      games: played,
      rates: Object.fromEntries(
        Object.entries(earned).map(([mode, counts]) => [
          mode,
          Object.fromEntries(
            Object.entries(counts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([id, n]) => [id, Math.round((n / (played[mode as GameMode] ?? 1)) * 1000) / 1000]),
          ),
        ]),
      ),
    };
    writeFileSync(join(out, "achievements.json"), `${JSON.stringify(rarity, null, 2)}\n`);
    console.log(`achievements.json: ${JSON.stringify(rarity.games)}`);
  }
}
