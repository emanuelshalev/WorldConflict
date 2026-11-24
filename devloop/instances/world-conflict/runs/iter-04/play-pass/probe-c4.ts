/** C-4: where the China-Taiwan relation goes in month 1 (staff policy: Accept all, calls left open). */
import { generateDeterministicIntents } from "../../../../../../src/agents/fallback.js";
import { createDataLoader } from "../../../../../../src/core/data-loader.js";
import { TurnEngine } from "../../../../../../src/core/turn.js";
import { staffMonth } from "../../../../../../scripts/policies.js";
const loader = createDataLoader();
for (const seed of [1000, 8919, 16838]) {
  const w = loader.newGame({ scenarioId: "2026", playerCountryId: "CHN", seed, mode: "FLASHPOINT", flashpointId: "quarantine" });
  const s = staffMonth(w, "staff");
  const intents = generateDeterministicIntents(w);
  const tw = intents.find((i) => i.countryId === "TWN");
  const vsChn = intents.filter((i) => i.actions.some((a) => a.targetCountryId === "CHN")).map((i) => `${i.countryId}:${i.actions.filter((a) => a.targetCountryId === "CHN").map((a) => a.type)}`);
  const n = new TurnEngine().executeTurn(w, s.orders, intents, s.decisions).newState;
  const r = n.turnReport;
  console.log(`seed ${seed}: CHN->TWN ${w.countries.find((c) => c.id === "CHN")?.relations.TWN} -> ${n.countries.find((c) => c.id === "CHN")?.relations.TWN?.toFixed(1)}`);
  console.log(`  TWN intent: ${JSON.stringify(tw?.actions.map((a) => `${a.type}:${a.targetCountryId ?? ""}`))}; moves at CHN: ${JSON.stringify(vsChn)}`);
  console.log(`  world moves: ${JSON.stringify(r?.world.filter((x) => [x.actor, x.target].some((y) => y === "TWN" || y === "CHN")).map((x) => `${x.actor} ${x.type} ${x.target ?? ""} ${x.status ?? ""}`))}`);
  console.log(`  yourView TWN: ${JSON.stringify(r?.yourView?.find((x) => x.id === "TWN"))}; causes: ${JSON.stringify(r?.causes.slice(0, 12))}`);
  console.log(`  decisions: ${JSON.stringify(r?.decisions.map((d) => `${d.title} -> ${d.choice} ${JSON.stringify(d.facts?.filter((f) => JSON.stringify(f).includes("Taiwan")))}`))}`);
}
