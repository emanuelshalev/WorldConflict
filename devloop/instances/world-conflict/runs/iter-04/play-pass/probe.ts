/** Probes for the known open items: C2-1 (Hormuz USA month 1, setting on) and C-4 (Quarantine China, Taiwan relation). */
import { generateDeterministicIntents } from "../../../../../../src/agents/fallback.js";
import { buildAdvice } from "../../../../../../src/core/advisors.js";
import { createDataLoader } from "../../../../../../src/core/data-loader.js";
import { TurnEngine } from "../../../../../../src/core/turn.js";
import { staffMonth } from "../../../../../../scripts/policies.js";

const loader = createDataLoader();
for (const seed of [1000, 8919, 16838]) {
  const w = loader.newGame({ scenarioId: "2026", playerCountryId: "USA", seed, mode: "FLASHPOINT", flashpointId: "hormuz-convoy" });
  const a = buildAdvice(w);
  const call = a.calls.find((c) => c.kind === "crisis");
  console.log(`HC-USA seed ${seed} bank ${w.politicalCapital} staffOrders ${a.staffOrders.map((o) => `${o.label}`).join(", ")} reserve ${a.reserve}`);
  console.log(`  mission ${call?.missionCard} calm ${call?.calmCard} chief ${call?.chiefPick} cabinet ${call ? a.cabinetPicks[call.id] : "-"} note ${call ? JSON.stringify(a.missionNotes[call.id]?.text) : "-"}`);
  for (const c of call?.cards ?? []) console.log(`   ${c.id} ${c.side} adv=${c.advisers} pc=${c.pc} price=${c.price} helps=${c.helps} hurts=${c.hurts} bh=${c.bonusHelps}`);
  console.log(`  move: ${a.calls.find((c) => c.kind === "move")?.cards.map((c) => `${c.label}(${c.pc})`).join(", ")} chief orders ${a.chief.orders.map((o) => o.label)}`);
}

// C-4: Quarantine China, relation with Taiwan month by month under three policies
const engine = new TurnEngine();
for (const policy of ["staff", "chief"]) {
  for (const seed of [1000, 8919, 16838]) {
    let w = loader.newGame({ scenarioId: "2026", playerCountryId: "CHN", seed, mode: "FLASHPOINT", flashpointId: "quarantine" });
    const line: string[] = [];
    for (let t = 0; t < 12 && !w.gameOver; t++) {
      const me = w.countries.find((c) => c.id === "CHN");
      const tw = w.countries.find((c) => c.id === "TWN");
      line.push(`${Math.round(me?.relations.TWN ?? 0)}/${Math.round(tw?.relations.CHN ?? 0)}`);
      const s = staffMonth(w, policy);
      const before = me?.relations.TWN ?? 0;
      w = engine.executeTurn(w, s.orders, generateDeterministicIntents(w), s.decisions).newState;
      const after = w.countries.find((c) => c.id === "CHN")?.relations.TWN ?? 0;
      if (t === 0 && seed === 1000) {
        console.log(`QU-CHN ${policy} month 1: ${before} -> ${after}; decisions ${JSON.stringify(s.decisions)}; orders ${JSON.stringify(s.orders.map((o) => `${o.type}:${o.targetCountryId ?? ""}`))}`);
        const r = w.turnReport;
        console.log(`  report decisions: ${JSON.stringify(r?.decisions.map((d) => d.choice))}`);
        console.log(`  causes with Taiwan: ${JSON.stringify((r?.causes ?? []).filter((c) => /Taiwan|Taipei/.test(c)))}`);
        const ev = (w.events ?? []).filter((e) => e.turn === 0 && /Taiwan|TWN/.test(`${e.title}${e.affectedCountries}`)).map((e) => e.title);
        console.log(`  events: ${JSON.stringify(ev)}`);
        console.log(`  foreign: ${JSON.stringify((r as unknown as { foreign?: { actor: string; type: string; target?: string }[] })?.foreign?.filter?.((f) => f.actor === "TWN" || f.target === "CHN").slice(0, 8))}`);
      }
    }
    const me = w.countries.find((c) => c.id === "CHN");
    line.push(`end ${Math.round(me?.relations.TWN ?? 0)} win ${w.outcome?.victory}`);
    console.log(`QU-CHN ${policy} seed ${seed} CHN->TWN/TWN->CHN: ${line.join(" ")}`);
  }
}
