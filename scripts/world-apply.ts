/**
 * Apply a reviewed world-scan proposal to the game data, then check the game still loads.
 *
 *   npm run world:apply -- data/world-scan/proposals/2026-11-20.json             # items with "accept": true
 *   npm run world:apply -- <file> --ids h-IRN-...,l-JPN,b-0                      # or exactly these ids
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateDeterministicIntents } from "../src/agents/fallback.js";
import { createDataLoader } from "../src/core/data-loader.js";
import { TurnEngine } from "../src/core/turn.js";
import { applyProposal, ProposalSchema } from "../src/tools/worldScan.js";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("Usage: npm run world:apply -- <proposal.json> [--ids a,b,c]");
  process.exit(1);
}
const idsAt = args.indexOf("--ids");
const only = idsAt >= 0 ? new Set((args[idsAt + 1] ?? "").split(",").filter(Boolean)) : undefined;
const proposal = ProposalSchema.parse(JSON.parse(readFileSync(file, "utf-8")));
const res = applyProposal(proposal, resolve("data"), only);
for (const c of res.changed) console.log(`+ ${c}`);
for (const s of res.skipped) console.log(`- ${s}`);
if (res.changed.length === 0) {
  console.log("Nothing applied. Set \"accept\": true on items, or pass --ids.");
  process.exit(0);
}
// Smoke test: every changed flashpoint and the 2026 world still start and play three months
const loader = createDataLoader(resolve("data"));
const games = [
  { scenarioId: "2026", playerCountryId: "USA" },
  ...loader.loadAvailableFlashpoints().map((f) => ({ scenarioId: f.scenarioId, playerCountryId: f.playable[0].countryId, flashpointId: f.id })),
];
for (const g of games) {
  let w = loader.newGame({ ...g, seed: 7, mode: g.flashpointId ? "FLASHPOINT" : "TERM" });
  for (let t = 0; t < 3; t++) w = new TurnEngine().executeTurn(w, [], generateDeterministicIntents(w), []).newState;
}
console.log(`\nApplied ${res.changed.length} change(s); ${games.length} worlds start and play. Run npm test, review the diff, commit.`);
