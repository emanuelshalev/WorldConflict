/**
 * Headless playtest harness: plays games end-to-end without the UI and reports
 * pacing/difficulty metrics against the design targets.
 *
 *   npm run sim -- --mode TERM --scenario 2026 --countries USA,ISR,IRN --games 12 --policy smart
 *   npm run sim -- --flashpoint hormuz-convoy --countries USA --policy smart --verbose 1
 *
 * Player policies:
 *   none        — does nothing (crises fall to their default option)
 *   propaganda  — a national address every month (the old dominant strategy)
 *   smart       — a heuristic competent player: fixes weaknesses, courts rivals, picks good crisis options
 *   random      — random affordable orders and random crisis options
 *   hawk        — mobilizes then attacks the main rival
 *   ai          — the player's country is driven by PersonalityAI
 */
import { generateDeterministicIntents, PersonalityAI } from "../src/agents/fallback.js";
import { actionCostPC } from "../src/core/costs.js";
import { createDataLoader } from "../src/core/data-loader.js";
import { combineSeed, SeededRandom } from "../src/core/seed.js";
import { TurnEngine } from "../src/core/turn.js";
import type {
  Action,
  CountryState,
  DecisionOption,
  GameMode,
  PendingDecision,
  WorldState,
} from "../src/core/types.js";

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

// ----------------------------------------------------------------------------
// Player policies
// ----------------------------------------------------------------------------

function affordable(world: WorldState, actions: Action[]): Action[] {
  let pc = world.politicalCapital;
  const out: Action[] = [];
  for (const a of actions) {
    const cost = actionCostPC(a);
    if (cost <= pc) {
      out.push(a);
      pc -= cost;
    }
  }
  return out;
}

function smartOrders(world: WorldState, me: CountryState): Action[] {
  const orders: Action[] = [];
  const recentPropaganda = world.director.propagandaTurns.filter((t) => world.turn - t < 6).length;
  // End losing wars
  for (const enemy of me.atWarWith) {
    const war = world.wars.find(
      (w) =>
        (w.attackerId === me.id && w.defenderId === enemy) ||
        (w.defenderId === me.id && w.attackerId === enemy),
    );
    const fromMe = war ? (war.attackerId === me.id ? war.frontline : 100 - war.frontline) : 50;
    if (fromMe < 55) orders.push({ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: enemy });
  }
  // Shore up the home front
  if (me.stability < 50 || me.legitimacy < 45) orders.push({ type: "DOMESTIC_REFORM" });
  const election = me.politicalSystem.nextElectionTurn;
  const campaigning = election !== null && election - world.turn <= 8 && election >= world.turn;
  const lastAddress = world.director.propagandaTurns.at(-1) ?? -99;
  if ((me.approval < 50 && recentPropaganda === 0) || (campaigning && world.turn - lastAddress >= 2))
    orders.push({ type: "DOMESTIC_PROPAGANDA" });
  if (me.insurgencyLevel === "REBELLION" || me.insurgencyLevel === "GUERILLA") {
    orders.push({ type: "DOMESTIC_POLICING", params: { tactic: "SOFT" } });
  }
  // Defuse the worst relationship; strengthen alliances
  const worst = Object.entries(me.relations)
    .filter(([id]) => !me.atWarWith.includes(id))
    .sort((a, b) => a[1] - b[1])[0];
  if (worst && worst[1] < -20) {
    orders.push({ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: worst[0] });
  }
  const friend = Object.entries(me.relations)
    .filter(([id, v]) => v > 50 && !me.alliances.includes(id))
    .sort((a, b) => b[1] - a[1])[0];
  if (friend && world.turn % 6 === 3) {
    orders.push({ type: "DIPLOMACY_PROPOSE_ALLIANCE", targetCountryId: friend[0] });
  }
  if (orders.length === 0) orders.push({ type: "DOMESTIC_REFORM" });
  return affordable(world, orders);
}

function optionValue(o: DecisionOption): number {
  const e = o.effects;
  let v =
    (e.approval ?? 0) +
    (e.stability ?? 0) * 1.2 +
    (e.legitimacy ?? 0) +
    (e.gdp ?? 0) * 6 +
    (e.growth ?? 0) * 12 +
    (e.pc ?? 0) * 2 +
    (e.coupShield ?? 0) * 1.5 +
    (e.relationsAllies ?? 0) * 0.3 -
    o.tensionDelta * 0.6;
  for (const [k, val] of Object.entries(e)) if (k.startsWith("relations:")) v += val * 0.15;
  if (o.actions.some((a) => a.type === "DIPLOMACY_DECLARE_WAR")) v -= 20;
  return v;
}

function decide(policy: string, decisions: PendingDecision[], rng: SeededRandom) {
  if (policy === "none" || policy === "propaganda") return []; // crises resolve by default
  return decisions.map((d) => ({
    decisionId: d.id,
    optionId:
      policy === "random"
        ? rng.pick(d.options).id
        : [...d.options].sort((a, b) => optionValue(b) - optionValue(a))[0].id,
  }));
}

function playerOrders(policy: string, world: WorldState, rng: SeededRandom): Action[] {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  if (!me) return [];
  switch (policy) {
    case "none":
      return [];
    case "propaganda":
      return [{ type: "DOMESTIC_PROPAGANDA" }];
    case "smart":
      return smartOrders(world, me);
    case "random": {
      const pool: Action[] = [
        { type: "DOMESTIC_REFORM" },
        { type: "DOMESTIC_PROPAGANDA" },
        { type: "MILITARY_MOBILIZE" },
        ...world.countries
          .filter((c) => c.id !== me.id)
          .slice(0, 8)
          .flatMap((c) => [
            { type: "DIPLOMACY_IMPROVE_RELATIONS" as const, targetCountryId: c.id },
            { type: "DIPLOMACY_DENOUNCE" as const, targetCountryId: c.id },
            { type: "INTEL_DESTABILIZE" as const, targetCountryId: c.id },
          ]),
      ];
      return affordable(world, rng.pickMultiple(pool, 2));
    }
    case "hawk": {
      const rival = me.history.historicalRivals.find((id) =>
        world.countries.some((c) => c.id === id && !c.collapsed),
      );
      if (!rival || me.atWarWith.length > 0 || me.mobilizationLevel < 50)
        return [{ type: "MILITARY_MOBILIZE" }];
      return [{ type: "DIPLOMACY_DECLARE_WAR", targetCountryId: rival }];
    }
    default:
      return affordable(
        world,
        new PersonalityAI().generateIntent(me, world, rng).actions,
      );
  }
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
    for (let g = 0; g < games; g++) {
      const seed = 1000 + g * 7919;
      const rng = new SeededRandom(combineSeed(seed, 99));
      let world = loader.newGame({
        scenarioId: scenario,
        playerCountryId: country,
        seed,
        mode,
        flashpointId,
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
      };
      let lastWarning = -99;
      for (let t = 0; t < 130 && !world.gameOver; t++) {
        const decisions = decide(policy, world.pendingDecisions, rng);
        const result = engine.executeTurn(
          world,
          playerOrders(policy, world, rng),
          generateDeterministicIntents(world),
          decisions,
        );
        world = result.newState;
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
      telegraphed: deposed.length ? pct(deposed.filter((r) => r.warnedBeforeDeposed).length, deposed.length) : "-",
      endings,
    };
    summary.push(row);
    if (!json) console.log(JSON.stringify(row));
  }
}
if (json) console.log(JSON.stringify(summary, null, 2));
