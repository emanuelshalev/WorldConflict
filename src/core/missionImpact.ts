/**
 * Mission impact: which objectives a crisis option, a meeting answer or an order helps, hurts or
 * breaks. One pure reading of the state, shared by the desk tags, the advisors' cabinet and
 * mission picks, and the harness, so all three agree. No RNG, no mutation.
 */
import { answerPrices } from "./costs.js";
import {
  type ConditionStatus,
  objectiveConditions,
  objectiveStatus,
  shortLabel,
} from "./objectives.js";
import { isNuclearOperational } from "./systems/nuclear.js";
import type {
  Action,
  CountryState,
  DecisionOption,
  ObjectiveCondition,
  WorldState,
} from "./types.js";

export type ImpactEffect = "helps" | "hurts" | "breaks";

export interface Impact {
  helps: string[]; // short labels of primary objectives helped
  hurts: string[];
  breaks: string[];
  bonusHelps: string[];
  bonusHurts: string[]; // bonus objectives hurt or broken
  /** +3 per primary helped, +1 per bonus helped, -4 per primary hurt, -1 per bonus hurt,
   *  -20 per primary broken, -3 per bonus broken. */
  score: number;
  /** Every objective touched, by index in objectiveStatus order. */
  links: Array<{ index: number; effect: ImpactEffect; bonus: boolean }>;
}

/** What a choice does, normalised: direct effects plus the actions it carries out. */
interface Signals {
  effects: Record<string, number>;
  actions: Action[];
}

export interface ImpactContext {
  world: WorldState;
  me: CountryState;
  conditions: Array<{ cond: ObjectiveCondition; bonus: boolean; status: ConditionStatus }>;
}

export function impactContext(world: WorldState): ImpactContext | null {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  if (!me) return null;
  const statuses = objectiveStatus(world);
  return {
    world,
    me,
    conditions: objectiveConditions(world).map((c, i) => ({ ...c, status: statuses[i] })),
  };
}

const HOSTILE_COVERT = [
  "INTEL_SABOTAGE",
  "INTEL_DESTABILIZE",
  "INTEL_SUPPORT_REBELS",
  "INTEL_ASSASSINATE",
  "INTEL_COUP",
];

/**
 * The likely direct effect of an order on the player's own numbers and on the target's view of
 * the player, by type (the preview's headline numbers, signs and rough sizes only).
 */
export function actionEffects(action: Action): Record<string, number> {
  const t = action.targetCountryId;
  const rel = (v: number): Record<string, number> => (t ? { [`relations:${t}`]: v } : {});
  switch (action.type) {
    case "DOMESTIC_REFORM":
      return { stability: 3, legitimacy: 2 };
    case "DOMESTIC_PROPAGANDA":
      return { approval: 4, stability: 2 };
    case "DOMESTIC_POLICING":
      return { insurgency: -1, ...(action.params?.tactic === "HARD" ? { approval: -3 } : {}) };
    case "MILITARY_MOBILIZE":
      return { mobilization: 20, stability: -2 };
    case "MILITARY_DEMOBILIZE":
      return { mobilization: -20, stability: 1 };
    case "DIPLOMACY_IMPROVE_RELATIONS":
      return rel(6);
    case "DIPLOMACY_PROPOSE_ALLIANCE":
      return rel(5);
    case "DIPLOMACY_DENOUNCE":
      return rel(-13);
    case "DIPLOMACY_BREAK_ALLIANCE":
      return rel(-35);
    case "DIPLOMACY_DECLARE_WAR":
      return rel(-50);
    case "MILITARY_AIRSTRIKE":
      return rel(-30);
    case "MILITARY_DEPLOY_BORDER":
      return rel(-8);
    case "MILITARY_WITHDRAW_BORDER":
      return rel(5);
    case "INTEL_MISINFORMATION":
      return rel(-5);
    default:
      return HOSTILE_COVERT.includes(action.type) ? rel(-10) : {};
  }
}

function signalsOfOption(o: DecisionOption): Signals {
  const effects = { ...o.effects };
  // Injected actions add their likely effects where the option does not state its own
  for (const a of o.actions)
    for (const [k, v] of Object.entries(actionEffects(a))) if (!(k in effects)) effects[k] = v;
  return { effects, actions: o.actions };
}

function signalsOfAction(a: Action): Signals {
  return { effects: actionEffects(a), actions: [a] };
}

const warBetween = (world: WorldState, a?: string, b?: string) =>
  world.wars.find(
    (w) => (w.attackerId === a && w.defenderId === b) || (w.attackerId === b && w.defenderId === a),
  );

/** Does this choice move this condition, and which way. */
function conditionEffect(
  ctx: ImpactContext,
  cond: ObjectiveCondition,
  sig: Signals,
): ImpactEffect | null {
  const { world, me } = ctx;
  const e = sig.effects;
  const acts = (type: string, target?: string) =>
    sig.actions.some(
      (a) => a.type === type && (target === undefined || a.targetCountryId === target),
    );
  const sign = (v: number | undefined, min: number) =>
    v === undefined || Math.abs(v) < min ? 0 : Math.sign(v);
  const pick = (s: number): ImpactEffect | null => (s > 0 ? "helps" : s < 0 ? "hurts" : null);
  const t = cond.targetId;

  // A threshold goal met with room to spare is neither helped nor hurt by a small move: only
  // what brings it within the margin (or moves it while it is short) counts
  const threshold = (now: number, need: number, v: number, margin: number) => {
    if (!v) return null;
    if (now >= need + margin && now + v >= need + margin) return null;
    return pick(v);
  };

  switch (cond.kind) {
    case "STAT_MIN": {
      const stat = cond.stat ?? "approval";
      return threshold(me[stat], cond.min ?? 50, sign(e[stat], 1) * Math.abs(e[stat] ?? 0), 8);
    }
    case "RELATION_MIN": {
      let v = sign(e[`relations:${t}`], 2) * Math.abs(e[`relations:${t}`] ?? 0);
      if (!v && t && me.alliances.includes(t))
        v = sign(e.relationsAllies, 2) * Math.abs(e.relationsAllies ?? 0);
      if (!v && t && me.history.historicalRivals.includes(t))
        v = sign(e.relationsRivals, 2) * Math.abs(e.relationsRivals ?? 0);
      return threshold(me.relations[t ?? ""] ?? 0, cond.min ?? 0, v, 10);
    }
    case "NO_WAR_WITH": {
      if (!t || me.atWarWith.includes(t)) return null;
      if (acts("DIPLOMACY_DECLARE_WAR", t)) return "breaks";
      const allyOf = sig.actions.find(
        (a) =>
          a.type === "DIPLOMACY_DECLARE_WAR" &&
          world.countries.find((c) => c.id === a.targetCountryId)?.alliances.includes(t),
      );
      if (allyOf) return "hurts";
      if (acts("MILITARY_AIRSTRIKE", t)) {
        // A peacetime strike on a nuclear power is an act of war: it answers with one
        // (TurnEngine.actOfWar), so the goal is lost, not just at risk
        const target = world.countries.find((c) => c.id === t);
        return target && isNuclearOperational(target) ? "breaks" : "hurts";
      }
      if (acts("INTEL_COUP", t) || acts("INTEL_ASSASSINATE", t)) return "hurts";
      // Only a real swing in an already hostile relationship moves the risk of war
      const rel = me.relations[t] ?? 0;
      if (rel < -40) return pick(sign(e[`relations:${t}`], 8));
      return null;
    }
    case "WAR_RESULT": {
      if (!t) return null;
      if (!me.atWarWith.includes(t)) return acts("DIPLOMACY_DECLARE_WAR", t) ? "hurts" : null;
      if (acts("DIPLOMACY_PROPOSE_CEASEFIRE", t) || `ceasefire:${t}` in e) return "helps";
      if (acts("MILITARY_AIRSTRIKE", t) || acts("MILITARY_MOBILIZE")) return "helps";
      if (acts("MILITARY_DEMOBILIZE")) return "hurts";
      return pick(sign(e.mobilization, 5));
    }
    case "WAR_ENDED": {
      const a = cond.targetId;
      const b = cond.otherId;
      const sides = [a, b];
      if (!warBetween(world, a, b)) {
        // Starting that war again (when we are one of its sides) undoes the goal
        return sides.some((x) => x && acts("DIPLOMACY_DECLARE_WAR", x)) ? "hurts" : null;
      }
      const party = sides.includes(me.id);
      const enemy = party ? sides.find((x) => x !== me.id) : undefined;
      if (
        sides.some(
          (x) =>
            x &&
            (acts("DIPLOMACY_MEDIATE", x) ||
              acts("DIPLOMACY_PROPOSE_CEASEFIRE", x) ||
              `ceasefire:${x}` in e),
        )
      )
        return "helps";
      if (sides.some((x) => x && acts("DIPLOMACY_DECLARE_WAR", x))) return "hurts";
      if (party && enemy) {
        if (acts("MILITARY_AIRSTRIKE", enemy) || acts("MILITARY_MOBILIZE")) return "hurts";
        return pick(sign(e[`relations:${enemy}`], 3));
      }
      return null;
    }
    case "NO_NUCLEAR": {
      if (!t) return null;
      if (acts("INTEL_SABOTAGE", t) || acts("MILITARY_AIRSTRIKE", t)) return "helps";
      return null;
    }
    case "INSURGENCY_MAX": {
      if (acts("DOMESTIC_POLICING")) return "helps";
      const s = sign(e.insurgency, 0.5) * -1 || sign(e.stability, 3);
      return pick(s);
    }
    case "NOT_COLLAPSED":
      if (!t) return null;
      return [
        "DIPLOMACY_DECLARE_WAR",
        "INTEL_DESTABILIZE",
        "INTEL_SUPPORT_REBELS",
        "INTEL_COUP",
      ].some((x) => acts(x, t))
        ? "hurts"
        : null;
    case "SCORE_PAR": {
      // Wars start and end the biggest score terms
      if (sig.actions.some((x) => x.type === "DIPLOMACY_DECLARE_WAR")) return "hurts";
      const ownWarEnds = me.atWarWith.some(
        (x) => acts("DIPLOMACY_PROPOSE_CEASEFIRE", x) || `ceasefire:${x}` in e,
      );
      if (ownWarEnds) return "helps";
      // Otherwise the rough change in the score targets (scoring.ts terms): approval / 2, the
      // stability lines at 65 (and 50 at peace) plus stability x 0.3 (it feeds the public mood),
      // growth x 1.2, a one-off GDP hit x 2. Only a
      // move of 3.5+ target points is tagged, so score tags are rarely wrong.
      let points =
        (e.approval ?? 0) / 2 + (e.stability ?? 0) * 0.3 + (e.growth ?? 0) * 1.2 + (e.gdp ?? 0) * 2;
      const stab = e.stability ?? 0;
      if (stab) {
        const after = me.stability + stab;
        const crosses = (line: number) =>
          (me.stability <= line && after > line) || (me.stability > line && after <= line);
        if (crosses(65)) points += 8 * Math.sign(stab);
        if (me.atWarWith.length === 0 && crosses(50)) points += 6 * Math.sign(stab);
      }
      return Math.abs(points) >= 3.5 ? pick(points) : null;
    }
    default:
      return null;
  }
}

const EMPTY = (): Impact => ({
  helps: [],
  hurts: [],
  breaks: [],
  bonusHelps: [],
  bonusHurts: [],
  score: 0,
  links: [],
});

function impactOf(ctx: ImpactContext | null, sig: Signals): Impact {
  const out = EMPTY();
  if (!ctx) return out;
  ctx.conditions.forEach(({ cond, bonus, status }, index) => {
    if (status.failed) return; // nothing helps or hurts a goal already lost
    const effect = conditionEffect(ctx, cond, sig);
    if (!effect) return;
    const label = shortLabel(cond);
    out.links.push({ index, effect, bonus });
    if (bonus) {
      if (effect === "helps") {
        out.bonusHelps.push(label);
        out.score += 1;
      } else {
        out.bonusHurts.push(label);
        out.score -= effect === "breaks" ? 3 : 1;
      }
    } else if (effect === "helps") {
      out.helps.push(label);
      out.score += 3;
    } else if (effect === "hurts") {
      out.hurts.push(label);
      out.score -= 4;
    } else {
      out.breaks.push(label);
      out.score -= 20;
    }
  });
  return out;
}

/** What a crisis option or meeting answer does to the mission. */
export function optionImpact(
  world: WorldState,
  option: DecisionOption,
  ctx: ImpactContext | null = impactContext(world),
): Impact {
  return impactOf(ctx, signalsOfOption(option));
}

/** What an order does to the mission. */
export function actionImpact(
  world: WorldState,
  action: Action,
  ctx: ImpactContext | null = impactContext(world),
): Impact {
  return impactOf(ctx, signalsOfAction(action));
}

/** True when the impact works against a primary objective (or a bonus, when `bonus`). */
export function againstMission(impact: Impact, bonus = false): boolean {
  return impact.hurts.length + impact.breaks.length > 0 || (bonus && impact.bonusHurts.length > 0);
}

/**
 * The extra political capital each answer of a crisis or meeting costs (D-84 R6, costs.ts
 * PUSH_PC): option id to price, priced answers only. Read from the month's starting state, the
 * same picture the desk shows and the engine charges.
 */
export function itemPrices(
  world: WorldState,
  item: { options: DecisionOption[] },
  ctx: ImpactContext | null = impactContext(world),
): Record<string, number> {
  if (!ctx) return {};
  return answerPrices(
    item.options.map((o) => o.id),
    item.options.map((o) => optionImpact(world, o, ctx).helps.length > 0),
  );
}
