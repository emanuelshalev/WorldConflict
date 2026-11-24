/**
 * Play pass, iteration 4: every flashpoint seat, N seeds, 12 months, the advice payload the API
 * returns (buildAdvice), three call policies on top of Accept all (the routine):
 *   chief:  the Chief of Staff pick on every call (advice.chief, the setting on)
 *   contra: the first card nobody recommends (else the first card that is not the mission card);
 *           Hold on the mission move
 *   staff:  every call left open (Skip / Hold)
 * Writes one JSON line per game month to out.jsonl.
 *   node node_modules/tsx/dist/cli.mjs <this> [seeds=3] [out.jsonl] [policies]
 */
import fs from "node:fs";
import { generateDeterministicIntents } from "../../../../../../src/agents/fallback.js";
import { buildAdvice, type CallCard, type YourCall } from "../../../../../../src/core/advisors.js";
import { createDataLoader } from "../../../../../../src/core/data-loader.js";
import { objectiveStatus } from "../../../../../../src/core/objectives.js";
import { TurnEngine } from "../../../../../../src/core/turn.js";
import type { Action, WorldState } from "../../../../../../src/core/types.js";
import { capitalAfter, staffMonth } from "../../../../../../scripts/policies.js";

const [seedsArg = "3", out = "play-pass.jsonl", polArg = "chief,contra,staff"] = process.argv.slice(2);
const SEEDS = Array.from({ length: Number(seedsArg) }, (_, g) => 1000 + g * 7919);
const POLICIES = polArg.split(",");
const loader = createDataLoader();
const fps = loader.loadAvailableFlashpoints();
const strip = ({ label: _l, ...a }: Action & { label: string }): Action => a;
const outF = fs.openSync(out, "w");

const vec = (c: { helps: string[]; hurts: string[]; breaks: string[]; bonusHelps: string[]; bonusHurts: string[]; pc: number; successChance: number | null; home: number }) => [
  3 * c.helps.length - 4 * c.hurts.length - 20 * c.breaks.length,
  c.bonusHelps.length - c.bonusHurts.length,
  -c.pc,
  c.successChance ?? 100,
  c.home,
];
const geq = (a: number[], b: number[]) => a.every((x, i) => x >= b[i]);
const goalSig = (c: Pick<CallCard, "helps" | "hurts" | "breaks" | "bonusHelps" | "bonusHurts">) =>
  JSON.stringify([c.helps, c.hurts, c.breaks, c.bonusHelps, c.bonusHurts].map((x) => [...x].sort()));

/** The play-pass definition of a real decision, on one call. */
function judge(world: WorldState, call: YourCall) {
  const d = world.pendingDecisions.find((x) => x.id === call.id);
  const free = call.kind === "move" || (d ? world.turn <= d.deadlineTurn - 1 : false);
  const open = call.cards.filter((c) => !c.blocked);
  // The leave outcome as a candidate: free = nothing happens; else the engine default (a card)
  // (the engine waives the D-84 price on a default answer: turn.ts resolveDecisions, !byDefault)
  const def = call.cards.find((c) => c.id === call.skip.optionId);
  const leave = free
    ? { id: "leave", label: "leaving it", helps: [], hurts: [], breaks: [], bonusHelps: [], bonusHurts: [], pc: 0, successChance: null, home: 0 }
    : def && def.price > 0
      ? { ...def, id: "leave", label: `leaving it (${def.label} without the price)`, pc: def.pc - def.price }
      : (def ?? null);
  const cands = [...open, ...(leave && !open.some((c) => c.id === leave.id) ? [leave as CallCard] : [])];
  const leaveBeatsMission = !!def && def.price > 0 && !free && def.id === call.missionCard;
  const reasons: string[] = [];
  // (a) material: two candidates differ on goals, or on the home front by 6+
  const sigs = new Set(cands.map(goalSig));
  const homes = cands.map((c) => c.home);
  const material = sigs.size >= 2 || Math.max(...homes) - Math.min(...homes) >= 6;
  if (!material) reasons.push(sigs.size < 2 ? "cosmetic: same goal effects" : "cosmetic");
  // (b) no single answer recommended by everyone and best on everything
  const backed = call.cards.filter((c) => c.advisers.length > 0);
  const agree = backed.length === 1;
  const dom = cands.find((a) => cands.every((b) => a === b || geq(vec(a), vec(b))));
  const domGoals = cands.find((a) => cands.every((b) => a === b || geq(vec(a).slice(0, 2), vec(b).slice(0, 2))));
  if (dom) reasons.push(`dominant: ${dom.label}`);
  else if (agree && domGoals && domGoals.id === backed[0].id) reasons.push(`advisers agree and best on goals: ${domGoals.label}`);
  // (c) leaving: free is acceptable when the desk says so (UI leaveText mirrors the engine)
  const real = reasons.length === 0;
  return { free, agree, real, reasons, trade: call.trade, leaveBeatsMission };
}

const cardOut = (c: CallCard) => ({
  id: c.id,
  label: c.label,
  side: c.side,
  adv: c.advisers,
  helps: c.helps,
  hurts: c.hurts,
  breaks: c.breaks,
  bh: c.bonusHelps,
  bx: c.bonusHurts,
  pc: c.pc,
  price: c.price,
  odds: c.successChance,
  home: c.home,
  blocked: !!c.blocked,
});

for (const f of fps)
  for (const p of f.playable)
    for (const policy of POLICIES)
      for (const seed of SEEDS) {
        let world = loader.newGame({ scenarioId: f.scenarioId, playerCountryId: p.countryId, seed, mode: "FLASHPOINT", flashpointId: f.id });
        const engine = new TurnEngine();
        for (let t = 0; t < 12 && !world.gameOver; t++) {
          const advice = buildAdvice(world);
          const chiefNow = policy === "chief" || (policy === "chiefskip1" && t > 0);
          const base = staffMonth(world, chiefNow ? "chief" : "staff");
          const decisions = [...base.decisions];
          let orders: Action[] = base.orders;
          const picks: Record<string, string | null> = {};
          if (policy === "contra") {
            const upkeep = advice.staffOrders.map((o) => strip(o.action));
            for (const call of advice.calls) {
              if (call.kind !== "crisis") {
                picks[call.id] = "hold";
                continue;
              }
              const left = capitalAfter(world, advice.prices, decisions, upkeep);
              const ok = call.cards.filter((c) => c.pc <= left);
              const card = ok.find((c) => c.advisers.length === 0) ?? ok.find((c) => c.id !== call.missionCard) ?? ok[0];
              if (!card) continue;
              decisions.push({ decisionId: call.id, optionId: card.id });
              picks[call.id] = card.id;
            }
          }
          if (chiefNow) for (const c of advice.calls) picks[c.id] = c.chiefPick;
          const me = world.countries.find((c) => c.id === world.playerCountryId);
          const rel = Object.fromEntries(
            (world.objective?.primary ?? [])
              .filter((c) => c.kind === "RELATION_MIN" && c.targetId)
              .map((c) => [c.targetId as string, Math.round(me?.relations[c.targetId as string] ?? 0)]),
          );
          const row = {
            fp: f.id,
            seat: p.countryId,
            def: f.playable[0].countryId === p.countryId,
            policy,
            seed,
            month: world.turn + 1,
            bank: world.politicalCapital,
            rel,
            pending: world.pendingDecisions.map((d) => d.title),
            unmet: objectiveStatus(world).filter((s) => !s.bonus && !s.met).length,
            unmetBonus: objectiveStatus(world).filter((s) => s.bonus && !s.met).length,
            staffCost: advice.staffOrders.length,
            calls: advice.calls.map((c) => ({
              id: c.id,
              kind: c.kind,
              title: c.title,
              missionCard: c.missionCard,
              calmCard: c.calmCard,
              chiefPick: c.chiefPick,
              guide: c.guide,
              skipOption: c.skip.optionId,
              cards: c.cards.map(cardOut),
              pick: picks[c.id] ?? null,
              ...judge(world, c),
            })),
          };
          fs.writeSync(outF, `${JSON.stringify(row)}\n`);
          world = engine.executeTurn(world, orders, generateDeterministicIntents(world), decisions).newState;
          orders = [];
        }
        const me = world.countries.find((c) => c.id === world.playerCountryId);
        fs.writeSync(
          outF,
          `${JSON.stringify({ end: true, fp: f.id, seat: p.countryId, policy, seed, victory: world.outcome?.victory ?? false, stars: world.outcome?.stars ?? 0, reason: world.gameOver?.reason ?? null, rel: Object.fromEntries(Object.entries(me?.relations ?? {}).filter(([k]) => ["TWN", "USA", "CHN", "PHL"].includes(k)).map(([k, v]) => [k, Math.round(v)])) })}\n`,
        );
      }
fs.closeSync(outF);
