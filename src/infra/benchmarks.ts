import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AchievementRarity, SeatBenchmark } from "../core/reveal.js";
import { seatFileName } from "../core/reveal.js";

/**
 * Benchmark files for the reveal's ranking ladder and achievement rarity, written by
 * `npm run bench:reveal` (scripts/simulate.ts --benchmark 1) into data/benchmarks/.
 * Each file carries a fingerprint of the code and data that decide the Presidency Score
 * and the achievements; tests/core/benchmarks.spec.ts fails when they drift apart.
 */

export const BENCHMARK_POLICIES = ["smart", "random", "none"] as const;
export const BENCHMARK_DIFFICULTY = "STATESMAN" as const;

/** Files whose changes move benchmark results: scoring, objectives, costs, the reveal itself, systems. */
export function fingerprintFiles(root: string): string[] {
  const core = join(root, "src", "core");
  const systems = readdirSync(join(core, "systems"))
    .filter((f) => f.endsWith(".ts"))
    .sort()
    .map((f) => join(core, "systems", f));
  return [
    ...[
      "scoring.ts",
      "objectives.ts",
      "costs.ts",
      "chronicle.ts",
      "achievements.ts",
      "reveal.ts",
    ].map((f) => join(core, f)),
    ...systems,
  ];
}

/**
 * A short hash of everything a benchmark depends on: the files above (line endings
 * normalised, so Windows checkouts agree), each flashpoint side's objectives and signature,
 * and the harness settings.
 */
export function benchmarkFingerprint(root: string): string {
  const h = createHash("sha256");
  for (const file of fingerprintFiles(root)) {
    h.update(file.slice(root.length).replace(/\\/g, "/"));
    h.update(readFileSync(file, "utf-8").replace(/\r\n/g, "\n"));
  }
  const fpDir = join(root, "data", "flashpoints");
  for (const f of readdirSync(fpDir)
    .filter((x) => x.endsWith(".json"))
    .sort()) {
    const fp = JSON.parse(readFileSync(join(fpDir, f), "utf-8")) as {
      turns?: number;
      objectives?: Record<
        string,
        { primary?: unknown; bonus?: unknown; par?: unknown; signature?: unknown }
      >;
    };
    const sides = Object.entries(fp.objectives ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, o]) => [id, o.primary, o.bonus, o.par, o.signature]);
    h.update(JSON.stringify([f, fp.turns, sides]));
  }
  h.update(JSON.stringify({ policies: BENCHMARK_POLICIES, difficulty: BENCHMARK_DIFFICULTY }));
  return h.digest("hex").slice(0, 16);
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function benchmarksDir(root = process.cwd()): string {
  return join(root, "data", "benchmarks");
}

export function loadSeatBenchmark(seatKey: string, root = process.cwd()): SeatBenchmark | null {
  return readJson<SeatBenchmark>(join(benchmarksDir(root), seatFileName(seatKey)));
}

export function loadAchievementRarity(root = process.cwd()): AchievementRarity | null {
  return readJson<AchievementRarity>(join(benchmarksDir(root), "achievements.json"));
}
