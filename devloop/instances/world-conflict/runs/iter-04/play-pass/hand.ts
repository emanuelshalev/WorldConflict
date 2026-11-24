/**
 * Hand play: prints the desk payload month by month for Hormuz USA, seed 1000, then plays the
 * choices given as JSON: [{decisions:{id:option}, orders:[Action], accept:true}] per month.
 *   node node_modules/tsx/dist/cli.mjs hand.ts '<json>'
 */
import { generateDeterministicIntents } from "../../../../../../src/agents/fallback.js";
import { buildAdvice, missionStatus } from "../../../../../../src/core/advisors.js";
import { createDataLoader } from "../../../../../../src/core/data-loader.js";
import { TurnEngine } from "../../../../../../src/core/turn.js";
import type { Action } from "../../../../../../src/core/types.js";
import { staffMonth } from "../../../../../../scripts/policies.js";
const plan: { decisions?: Record<string, string>; orders?: Action[]; replace?: boolean }[] = JSON.parse(process.argv[2] ?? "[]");
const [fp = "hormuz-convoy", seat = "USA"] = process.argv.slice(3);
const loader = createDataLoader();
let w = loader.newGame({ scenarioId: "2026", playerCountryId: seat, seed: 1000, mode: "FLASHPOINT", flashpointId: fp });
const engine = new TurnEngine();
console.log(`OBJECTIVE ${w.objective?.title}: ${w.objective?.briefing}`);
for (let t = 0; t <= plan.length && !w.gameOver; t++) {
  const a = buildAdvice(w);
  const me = w.countries.find((c) => c.id === seat);
  console.log(`\n===== MONTH ${w.turn + 1} (${w.date}) PC ${w.politicalCapital} approval ${me?.approval.toFixed(0)} stability ${me?.stability.toFixed(0)} score ${w.score.total}`);
  for (const s of missionStatus(w)) console.log(`  goal${s.bonus ? " (bonus)" : ""}: ${s.label} ${s.met ? "ON TRACK" : "behind"} now=${s.now ?? ""} need=${s.need ?? ""}${s.step ? " <- this month's step" : ""}`);
  for (const d of w.pendingDecisions) {
    console.log(`  CRISIS ${d.id} ${d.title} (deadline turn ${d.deadlineTurn}, now ${w.turn}): ${d.situation?.slice(0, 220)}`);
    for (const o of d.options) console.log(`    - ${o.id}: ${o.label} ${JSON.stringify(o.effects)} t${o.tensionDelta} acts=${o.actions.map((x) => `${x.type}:${x.targetCountryId ?? ""}`)}${o.id === d.defaultOptionId ? " [default]" : ""}`);
  }
  for (const c of a.calls) {
    console.log(`  YOUR CALL ${c.title}: guide "${c.guide}" | chief ${c.chiefPick} | trade ${c.trade}`);
    for (const k of c.cards) console.log(`    [${k.side}] ${k.label} by ${k.advisers.join("+") || "-"}${k.why ? ` "${k.why}"` : ""} helps=${k.helps} hurts=${k.hurts} breaks=${k.breaks} bonus+=${k.bonusHelps} bonus-=${k.bonusHurts} pc=${k.pc}${k.price ? ` (price ${k.price})` : ""} odds=${k.successChance ?? "-"}${k.blocked ? " BLOCKED" : ""}`);
  }
  console.log(`  ROUTINE (Accept all ${a.routine.length}): ${a.routine.map((r) => `${r.kind}:${r.label}`).join(" | ")}`);
  if (t === plan.length) break;
  const p = plan[t];
  const s = staffMonth(w, "staff");
  const decisions = [...s.decisions.filter((d) => !(p.decisions && d.decisionId in p.decisions)), ...Object.entries(p.decisions ?? {}).map(([decisionId, optionId]) => ({ decisionId, optionId }))];
  const orders = p.replace ? (p.orders ?? []) : [...(p.orders ?? []), ...s.orders];
  w = engine.executeTurn(w, orders, generateDeterministicIntents(w), decisions).newState;
  const r = w.turnReport;
  console.log(`  -> REPORT: decisions ${JSON.stringify(r?.decisions.map((d) => `${d.title}: ${d.choice} [${d.status ?? ""}]`))}`);
  console.log(`     orders ${JSON.stringify(r?.orders.map((o) => `${o.label}: ${o.status ?? ""} ${o.detail.slice(0, 80)}`))}`);
  console.log(`     causes ${JSON.stringify(r?.causes.slice(0, 6))}; headlines ${JSON.stringify(w.newspaper.slice(0, 2).map((n) => n.headline))}`);
}
