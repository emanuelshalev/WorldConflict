import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";
import { ACHIEVEMENTS } from "../../src/core/achievements.js";
import { type AchievementRarity, type SeatBenchmark, seatFileName } from "../../src/core/reveal.js";
import { BENCHMARK_POLICIES, benchmarkFingerprint, benchmarksDir } from "../../src/infra/benchmarks.js";

/**
 * The reveal's ranking ladder and seal rarity come from committed benchmark files. They go stale
 * when the score, objectives, achievements or systems change: regenerate with
 * `npm run bench:reveal` (about 15 minutes) and commit data/benchmarks/.
 */
const root = process.cwd();
const dir = benchmarksDir(root);
const fingerprint = benchmarkFingerprint(root);
const STALE = "stale benchmarks: run `npm run bench:reveal` and commit data/benchmarks/";

describe("reveal benchmarks", () => {
  const seats = createDataLoader()
    .loadAvailableFlashpoints()
    .flatMap((fp) => fp.playable.map((p) => `${fp.id}:${p.countryId}`));

  it("has a fresh file for every flashpoint seat with all three policies", () => {
    for (const seat of seats) {
      const path = join(dir, seatFileName(seat));
      expect(existsSync(path), `missing ${path}: ${STALE}`).toBe(true);
      const bench = JSON.parse(readFileSync(path, "utf-8")) as SeatBenchmark;
      expect(bench.seatKey).toBe(seat);
      expect(bench.fingerprint, `${seat}: ${STALE}`).toBe(fingerprint);
      for (const policy of BENCHMARK_POLICIES) {
        const s = bench.policies[policy];
        expect(s?.q).toHaveLength(21);
        expect(s && s.p10 <= s.p50 && s.p50 <= s.p90 && s.p90 <= s.max).toBe(true);
      }
    }
  });

  it("has fresh achievement rarity for every core seal's mode", () => {
    const rarity = JSON.parse(readFileSync(join(dir, "achievements.json"), "utf-8")) as AchievementRarity;
    expect(rarity.fingerprint, STALE).toBe(fingerprint);
    expect(rarity.games.FLASHPOINT).toBeGreaterThan(0);
    for (const rates of Object.values(rarity.rates))
      for (const v of Object.values(rates ?? {})) expect(v >= 0 && v <= 1).toBe(true);
    // Seals nobody earned are simply absent (rate 0); ids that exist must be known seals or signatures
    const known = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const id of Object.keys(rarity.rates.TERM ?? {})) expect(known.has(id)).toBe(true);
  });

  it("competent staff beat doing nothing on most seats", () => {
    let better = 0;
    for (const seat of seats) {
      const bench = JSON.parse(readFileSync(join(dir, seatFileName(seat)), "utf-8")) as SeatBenchmark;
      if ((bench.policies.smart?.p50 ?? 0) > (bench.policies.none?.p50 ?? 0)) better++;
    }
    expect(better / seats.length).toBeGreaterThanOrEqual(0.7);
  });
});
