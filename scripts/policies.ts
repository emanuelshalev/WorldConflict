/**
 * The harness's player policies (none, random, smart, staff...), shared by the headless playtest
 * harness (scripts/simulate.ts), the reveal benchmarks (scripts/benchmark.ts) and the reveal
 * consistency suite (tests/core/consistency.spec.ts), so the tests play exactly what the harness plays.
 */
import { PersonalityAI } from "../src/agents/fallback.js";
import { buildAdvice } from "../src/core/advisors.js";
import { actionCostPC } from "../src/core/costs.js";
import type { SeededRandom } from "../src/core/seed.js";
import type {
  Action,
  CountryState,
  DecisionOption,
  PendingDecision,
  WorldState,
} from "../src/core/types.js";


/** The staff autopilot's month: crisis picks, meeting answers and orders (design-month 5.4). */
export function staffMonth(world: WorldState, switchToMission: boolean) {
  const advice = buildAdvice(world);
  const decisions = [
    ...world.pendingDecisions.map((d) => ({
      decisionId: d.id,
      optionId: switchToMission ? advice.missionPicks[d.id] : advice.cabinetPicks[d.id],
    })),
    ...Object.entries(advice.meetingPicks).map(([decisionId, optionId]) => ({ decisionId, optionId })),
  ];
  const orders: Action[] = advice.staffOrders.map(({ action: { label: _l, ...a } }) => a);
  return { decisions, orders };
}

// ----------------------------------------------------------------------------
// Player policies
// ----------------------------------------------------------------------------

export function affordable(world: WorldState, actions: Action[]): Action[] {
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

export function smartOrders(world: WorldState, me: CountryState): Action[] {
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
  // Broker the war our mission needs ended
  for (const c of [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])]) {
    if (c.kind !== "WAR_ENDED" || !c.targetId) continue;
    const ongoing = world.wars.some((w) => [w.attackerId, w.defenderId].includes(c.targetId as string));
    if (ongoing && !me.atWarWith.includes(c.targetId))
      orders.push({ type: "DIPLOMACY_MEDIATE", targetCountryId: c.targetId });
  }
  // Shore up the home front
  if (me.stability < 50 || me.legitimacy < 45) orders.push({ type: "DOMESTIC_REFORM" });
  const election = me.politicalSystem.nextElectionTurn;
  const campaigning = election !== null && election - world.turn <= 8 && election >= world.turn;
  const lastAddress = world.director.propagandaTurns.at(-1) ?? -99;
  if ((me.approval < 50 && recentPropaganda === 0) || (campaigning && world.turn - lastAddress >= 2))
    orders.push({ type: "DOMESTIC_PROPAGANDA" });
  // Foreign services working on us: hunt them before they topple us
  const meddled = (world.turnReport?.causes ?? []).some((c) => c.startsWith("Foreign covert"));
  if (meddled && world.turn > world.director.counterIntelUntil)
    orders.unshift({ type: "INTEL_COUNTER_INTEL" });
  if (me.insurgencyLevel === "REBELLION" || me.insurgencyLevel === "GUERILLA") {
    orders.push({ type: "DOMESTIC_POLICING", params: { tactic: "SOFT" } });
  }
  // Mission stat goals at risk come first: reform for stability/legitimacy, address for approval
  for (const c of [...(world.objective?.primary ?? [])]) {
    if (c.kind !== "STAT_MIN" || !c.stat) continue;
    if ((me[c.stat] ?? 0) >= (c.min ?? 50) + 8) continue;
    if (c.stat === "approval") {
      if (world.turn - (world.director.propagandaTurns.at(-1) ?? -99) >= 2)
        orders.unshift({ type: "DOMESTIC_PROPAGANDA" });
    } else orders.unshift({ type: "DOMESTIC_REFORM" });
  }
  // Keep mission-critical relationships above their thresholds
  for (const c of [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])]) {
    if (c.kind === "RELATION_MIN" && c.targetId && (me.relations[c.targetId] ?? 0) < (c.min ?? 0) + 10)
      orders.push({ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: c.targetId });
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

export function optionValue(o: DecisionOption, keyRelations: Set<string> = new Set()): number {
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
  // A player reads the mission: relationships named in the objective matter a lot
  for (const [k, val] of Object.entries(e)) {
    if (k.startsWith("relations:")) v += val * (keyRelations.has(k.split(":")[1]) ? 1.2 : 0.15);
  }
  if (o.actions.some((a) => a.type === "DIPLOMACY_DECLARE_WAR")) v -= 20;
  return v;
}

export function objectiveRelations(world: WorldState): Set<string> {
  const ids = new Set<string>();
  for (const c of [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])]) {
    if (c.kind !== "RELATION_MIN" || !c.targetId) continue;
    // A relationship the mission names only matters while it is near its threshold
    const me = world.countries.find((x) => x.id === world.playerCountryId);
    if ((me?.relations[c.targetId] ?? 0) < (c.min ?? 0) + 25) ids.add(c.targetId);
  }
  return ids;
}

export function decide(policy: string, decisions: PendingDecision[], rng: SeededRandom, world: WorldState) {
  if (policy === "none" || policy === "propaganda") return []; // crises resolve by default
  const key = objectiveRelations(world);
  // Meetings: capital spent on a call is capital not spent on orders, so weigh it harder
  // (Flashpoints run on 3 a month), and send a deputy when no answer is worth the time
  const pcWeight = world.mode === "FLASHPOINT" ? 6 : 3;
  const value = (d: PendingDecision, o: DecisionOption) =>
    optionValue(o, key) + ("kind" in d ? (o.effects.pc ?? 0) * pcWeight : 0);
  return decisions.map((d) => ({
    decisionId: d.id,
    optionId:
      policy === "random"
        ? rng.pick(d.options).id
        : [...d.options].sort((a, b) => value(d, b) - value(d, a))[0].id,
  }));
}

export function playerOrders(policy: string, world: WorldState, rng: SeededRandom): Action[] {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  if (!me) return [];
  switch (policy) {
    case "none":
    case "greedy":
      return [];
    case "loop":
      return affordable(world, [
        world.turn % 2 === 0 ? { type: "DOMESTIC_REFORM" } : { type: "DOMESTIC_PROPAGANDA" },
      ]);
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

