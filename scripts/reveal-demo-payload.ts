/**
 * Writes the reveal gallery payload (ui/src/components/reveal/demo/hormuz-usa.json): the reveal
 * test fixture's finished Hormuz USA world (tests/fixtures/reveal/hormuz-usa.ts), built with the
 * real flashpoint reality rows, benchmarks and rarity so the gallery (#reveal-demo) shows every
 * stage. Run: npx tsx scripts/reveal-demo-payload.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createDataLoader } from "../src/core/data-loader.js";
import { buildReveal, seatKeyOf } from "../src/core/reveal.js";
import { loadAchievementRarity, loadSeatBenchmark } from "../src/infra/benchmarks.js";
import { fixtureWorld } from "../tests/fixtures/reveal/hormuz-usa.js";

const world = fixtureWorld();
// The fixture keeps the opening date; a finished 12-month session ends a month after its last month
world.date = "2027-11";
const fp = createDataLoader().loadFlashpoint("hormuz-convoy");
const side = fp.objectives[world.playerCountryId];
const reveal = buildReveal(world, {
  benchmarks: loadSeatBenchmark(seatKeyOf(world)),
  rarity: loadAchievementRarity(),
  reality: side?.reality ?? null,
  signature: side?.signature ?? null,
  sources: fp.sources ?? [],
  seatDifficulty:
    fp.playable.find((p) => p.countryId === world.playerCountryId)?.difficulty ?? null,
  personalBest: 611,
  saveId: "demo",
  date: "2026-11-21T12:00:00.000Z",
});
mkdirSync("ui/src/components/reveal/demo", { recursive: true });
writeFileSync("ui/src/components/reveal/demo/hormuz-usa.json", `${JSON.stringify(reveal, null, 1)}\n`);
console.log(`presidency ${reveal.presidency.total}, truth rows ${reveal.truth?.rows.length ?? 0}`);
