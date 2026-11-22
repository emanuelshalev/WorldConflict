/**
 * The advisors: what the staff recommend each month. The suggested orders (mission first, then
 * wars, then the home front), the cabinet pick and the mission pick for each crisis, the
 * suggested answer for each meeting, and the orders the staff queue on their own. Ported from
 * ui/src/lib/staff.ts so the desk, the map strip and the harness agree. Pure reads of the state:
 * foreign numbers come from the player's beliefs (buildPlayerView), never ground truth; memory of
 * last month comes from the turn report. No RNG.
 */
import { actionCostPC } from "./costs.js";
import { MEETING_SLOTS } from "./meetings.js";
import {
  actionImpact,
  againstMission,
  type Impact,
  type ImpactContext,
  impactContext,
  optionImpact,
} from "./missionImpact.js";
import { type ConditionStatus, type ObjectiveHelp, objectiveStatus } from "./objectives.js";
import { missionWarning, previewAction } from "./preview.js";
import { buildPlayerView } from "./systems/intelligence.js";
import type {
  Action,
  DecisionOption,
  Meeting,
  Objective,
  PendingDecision,
  WorldState,
} from "./types.js";

export type Advisor =
  | "Foreign Minister"
  | "Defense Minister"
  | "Interior Minister"
  | "Chief of Staff"
  | "Intelligence Chief";

export interface Suggestion {
  who: Advisor;
  label: string;
  why: string;
  action: Action & { label: string };
}

export interface StaffOrder extends Suggestion {
  /** Odds of success 0-100 (null = certain), from the preview. */
  successChance: number | null;
}

export interface Advice {
  suggestions: Suggestion[];
  /** The cabinet's consensus per crisis (can hurt the mission on STATESMAN and STRONGMAN). */
  cabinetPicks: Record<string, string>;
  /** The option with the best mission score per crisis. */
  missionPicks: Record<string, string>;
  /** The staff's suggested answer per meeting they would attend in person. */
  meetingPicks: Record<string, string>;
  /** Meetings that go to a deputy when the player approves all. */
  deputies: string[];
  /**
   * The orders the staff propose this month, in order. The desk shows them as proposals that hold
   * no political capital until the player approves them (one by one or with Approve all, F-02-4);
   * the balance harness's staff policy plays Approve all, so it runs every one of them.
   */
  staffOrders: StaffOrder[];
  /**
   * What the desk may say about the mission pick per crisis: a clean "Best for your mission", an
   * honest "Best trade-off: helps X, costs Y" or "Least harm", and whether to offer a switch away
   * from the cabinet pick. Absent when no option is better for the mission than another.
   */
  missionNotes: Record<string, MissionNote>;
}

export interface MissionNote {
  optionId: string;
  kind: "best" | "tradeoff" | "least";
  /** The tag on the card: "Best for your mission", "Best trade-off: helps Front, costs Approval". */
  text: string;
  helps: string[];
  costs: string[];
  /** Offer "Switch to <option>" only when the cabinet pick hurts a goal the mission pick does not. */
  switchFrom: { cabinetId: string; goal: string; breaks: boolean } | null;
}

const STAT_NAMES: Record<string, string> = {
  approval: "Approval",
  stability: "Stability",
  legitimacy: "Legitimacy",
};
const INSURGENCY_ORDER = ["NONE", "UNREST", "REBELLION", "GUERILLA"];
/** At this mobilization the staff stop suggesting another call-up (it caps at 100 and costs stability). */
const MOBILIZE_CAP = 85;

/** Orders the staff never queue on their own. */
export const DANGEROUS = new Set([
  "DIPLOMACY_DECLARE_WAR",
  "DIPLOMACY_BREAK_ALLIANCE",
  "MILITARY_DEPLOY_BORDER",
  "MILITARY_AIRSTRIKE",
  "NUCLEAR_FUND_PROGRAM",
  "NUCLEAR_STRIKE",
  "INTEL_SUPPORT_REBELS",
  "INTEL_ASSASSINATE",
  "INTEL_COUP",
]);
/** Staff propose at most this many orders a month... */
export const STAFF_ORDERS = 2;
/** ...and always leave this much political capital for the player's own orders. */
export const RESERVE_PC = 1;
/** Orders with worse odds than this (percent) are left for the player to decide. */
export const MIN_ODDS = 35;

const nameOf = (world: WorldState, id: string) =>
  world.countries.find((c) => c.id === id)?.name ?? id;
const me = (world: WorldState) => world.countries.find((c) => c.id === world.playerCountryId);

// ----------------------------------------------------------------------------
// Suggestions
// ----------------------------------------------------------------------------

export function computeSuggestions(world: WorldState, limit = 5): Suggestion[] {
  const player = me(world);
  if (!player) return [];
  const view = buildPlayerView(world);
  const others = view.filter((v) => !v.isPlayer);
  const out: Array<Suggestion & { p: number }> = [];
  const rel = (id: string) => Math.round(player.relations[id] ?? 0);
  const report = world.turnReport;
  const lastOrders = report?.orders ?? [];
  const lastAddress = lastOrders.some((o) => o.ok && o.type === "DOMESTIC_PROPAGANDA");
  const name = (id: string) => nameOf(world, id);
  // Courting stalled: we courted them last month and their view of us did not rise
  const courtStalled = (id: string) => {
    const courted = lastOrders.some(
      (o) => o.ok && o.type === "DIPLOMACY_IMPROVE_RELATIONS" && o.target === id,
    );
    if (!courted) return false;
    const moved = (report?.relations ?? []).find((r) => r.id === id);
    return !moved || moved.after <= moved.before;
  };
  const court = (id: string, p: number, why: string): Suggestion & { p: number } => ({
    p,
    who: "Foreign Minister",
    label: `Court ${name(id)}`,
    why,
    action: {
      type: "DIPLOMACY_IMPROVE_RELATIONS",
      label: `Court ${name(id)}`,
      targetCountryId: id,
    },
  });
  const reform = { type: "DOMESTIC_REFORM" as const, label: "Reform program" };
  const address = { type: "DOMESTIC_PROPAGANDA" as const, label: "National address" };
  const ceasefire = (id: string) => ({
    type: "DIPLOMACY_PROPOSE_CEASEFIRE" as const,
    label: `Propose ceasefire to ${name(id)}`,
    targetCountryId: id,
  });

  // 0. After our own nuclear strike, everyone at the table says the same thing: end it
  const nukeShock = [...(world.director.shocks ?? [])]
    .reverse()
    .find((x) => x.kind === "NUCLEAR_STRIKE" && x.by === player.id && world.turn - x.turn <= 6);
  if (nukeShock?.target && player.atWarWith.includes(nukeShock.target)) {
    out.push({
      p: 1000,
      who: "Foreign Minister",
      label: `Propose ceasefire to ${name(nukeShock.target)}`,
      why: `After the strike, ${name(nukeShock.target)} cannot hold out and the world is watching. End it now, on our terms.`,
      action: ceasefire(nukeShock.target),
    });
  }

  // 1. The mission comes first: protect every objective condition that is unmet or slipping
  const goals = [
    ...(world.objective?.primary ?? []).map((c) => ({ c, bonus: false })),
    ...(world.objective?.bonus ?? []).map((c) => ({ c, bonus: true })),
  ];
  for (const { c, bonus } of goals) {
    const boost = bonus ? -8 : 0;
    if (c.kind === "RELATION_MIN" && c.targetId && !player.atWarWith.includes(c.targetId)) {
      const need = c.min ?? 0;
      const now = rel(c.targetId);
      if (now < need + 10) {
        const gap =
          now < need ? `needs ${need}+, now ${now}` : `needs ${need}+, now ${now}: keep the margin`;
        out.push(
          court(
            c.targetId,
            (now < need ? 96 : 88) + boost,
            `Mission: ${name(c.targetId)} ${gap}.${courtStalled(c.targetId) ? " Last month did not move them; keep at it and avoid crisis options that anger them." : ""}`,
          ),
        );
      }
    } else if (c.kind === "STAT_MIN" && c.stat) {
      const need = c.min ?? 50;
      const now = Math.round(player[c.stat] ?? 0);
      if (now < need + 8) {
        const statName = STAT_NAMES[c.stat] ?? c.stat;
        const fell = trendNote(world, c.stat);
        if (c.stat === "approval" && !lastAddress)
          out.push({
            p: (now < need ? 94 : 86) + boost,
            who: "Chief of Staff",
            label: "National address",
            why: `Mission: approval needs ${need}%+, now ${now}%.${fell}`,
            action: address,
          });
        else
          out.push({
            p: (now < need ? 93 : 85) + boost,
            who: "Interior Minister",
            label: "Reform program",
            why: `Mission: ${statName.toLowerCase()} needs ${need}%+, now ${now}%.${fell}`,
            action: reform,
          });
      }
    } else if (c.kind === "WAR_ENDED" && c.targetId) {
      const at = c.targetId;
      if (
        at !== player.id &&
        world.wars.some((w) => [w.attackerId, w.defenderId].includes(at)) &&
        !player.atWarWith.includes(at)
      )
        out.push({
          p: 92 + boost,
          who: "Foreign Minister",
          label: `Mediate peace for ${name(at)}`,
          why: "Mission: this war must end. Every round of talks wears both sides down.",
          action: {
            type: "DIPLOMACY_MEDIATE",
            label: `Mediate peace for ${name(at)}`,
            targetCountryId: at,
          },
        });
    } else if (c.kind === "NO_WAR_WITH" && c.targetId && !player.atWarWith.includes(c.targetId)) {
      const now = rel(c.targetId);
      if (now < -40 && !courtStalled(c.targetId))
        out.push(
          court(
            c.targetId,
            70 + boost,
            `Mission: no war with ${name(c.targetId)}. Relations ${now}; lower the temperature.`,
          ),
        );
    } else if (c.kind === "NO_NUCLEAR" && c.targetId) {
      const v = others.find((o) => o.id === c.targetId);
      const est = v?.nuclearProgress?.estimate ?? 0;
      if (v && v.nuclearStatus === "DEVELOPING")
        out.push(
          est > 55
            ? {
                p: 89 + boost,
                who: "Intelligence Chief",
                label: `Sabotage ${v.name}`,
                why: `Mission: ${v.name} must not test. Their program may be ~${Math.round(est)}% along.`,
                action: {
                  type: "INTEL_SABOTAGE",
                  label: `Sabotage ${v.name}`,
                  targetCountryId: v.id,
                },
              }
            : {
                p: 74 + boost,
                who: "Intelligence Chief",
                label: `Spy on ${v.name}`,
                why: `Mission: watch ${v.name}'s program (~${Math.round(est)}% by our estimate).`,
                action: { type: "INTEL_GATHER", label: `Spy on ${v.name}`, targetCountryId: v.id },
              },
        );
    } else if (c.kind === "SCORE_PAR" && !bonus) {
      // The score drifts toward what the situation deserves: lift its weakest part, early
      const need = c.min ?? world.objective?.par ?? 100;
      const now = world.score.total;
      if (now < need + 6) {
        const gap =
          now < need ? `needs ${need}+, now ${now}` : `needs ${need}+, now ${now}: keep the margin`;
        const parts = (["approval", "prestige", "security", "economic"] as const).map((k) => ({
          k,
          v: world.score[k],
        }));
        const weakest = parts.sort((a, b) => a.v - b.v)[0].k;
        const p = now < need ? 91 : 84;
        if (weakest === "approval" && !lastAddress)
          out.push({
            p,
            who: "Chief of Staff",
            label: "National address",
            why: `Mission: leadership score ${gap}. Approval is its weakest part.`,
            action: address,
          });
        else if (weakest === "prestige") {
          const partner = [...others]
            .filter(
              (v) =>
                !player.atWarWith.includes(v.id) &&
                !(player.history?.historicalRivals ?? []).includes(v.id) &&
                rel(v.id) > -30 &&
                rel(v.id) < 70 &&
                !courtStalled(v.id),
            )
            .sort((a, b) => b.relationWithPlayer - a.relationWithPlayer)[0];
          if (partner)
            out.push(
              court(
                partner.id,
                p,
                `Mission: leadership score ${gap}. World standing is its weakest part.`,
              ),
            );
        } else
          out.push({
            p,
            who: "Interior Minister",
            label: "Reform program",
            why: `Mission: leadership score ${gap}. A stronger, steadier country lifts it.`,
            action: reform,
          });
      }
    } else if (c.kind === "INSURGENCY_MAX") {
      if (
        INSURGENCY_ORDER.indexOf(player.insurgencyLevel) >=
        INSURGENCY_ORDER.indexOf(c.level ?? "UNREST")
      )
        out.push({
          p: 90 + boost,
          who: "Interior Minister",
          label: "Soft policing",
          why: `Mission: insurgency must stay at ${(c.level ?? "UNREST").toLowerCase()} or below.`,
          action: {
            type: "DOMESTIC_POLICING",
            label: "Soft policing",
            params: { tactic: "SOFT" },
          },
        });
    }
  }

  // 2. Wars we are in
  for (const enemy of player.atWarWith) {
    const war = world.wars.find(
      (w) =>
        [w.attackerId, w.defenderId].includes(enemy) &&
        [w.attackerId, w.defenderId].includes(player.id),
    );
    const mine = war ? (war.attackerId === player.id ? war.frontline : 100 - war.frontline) : 50;
    // Already (nearly) fully mobilized: another call-up adds nothing and still costs stability
    if (mine >= 50 && player.mobilizationLevel >= MOBILIZE_CAP) continue;
    out.push(
      mine < 50
        ? {
            p: 95,
            who: "Foreign Minister",
            label: `Propose ceasefire to ${name(enemy)}`,
            why:
              mine <= 35
                ? `The front is at ${Math.round(mine)} from our side. Their terms will sting, but far less than a defeat.`
                : `The front is at ${Math.round(mine)} from our side and going badly. Stop the bleeding.`,
            action: ceasefire(enemy),
          }
        : {
            p: 70,
            who: "Defense Minister",
            label: "Mobilize forces",
            why: `The front is at ${Math.round(mine)} from our side. We hold the initiative; press it.`,
            action: { type: "MILITARY_MOBILIZE", label: "Mobilize forces" },
          },
    );
  }

  // 3. The home front and general statecraft
  if (player.stability < 50 || player.legitimacy < 45)
    out.push({
      p: 84,
      who: "Interior Minister",
      label: "Reform program",
      why: `Stability ${Math.round(player.stability)}%: the state needs shoring up. Reform takes months to pay off; start now.`,
      action: reform,
    });
  if (player.approval < 55 && !lastAddress)
    out.push({
      p: 75,
      who: "Chief of Staff",
      label: "National address",
      why: `Approval ${Math.round(player.approval)}%. Speak to the nation (works less if repeated).`,
      action: address,
    });
  const missionIds = new Set(goals.map(({ c }) => c.targetId).filter(Boolean));
  const worst = [...others]
    .filter((v) => !player.atWarWith.includes(v.id) && !missionIds.has(v.id) && !courtStalled(v.id))
    .sort((a, b) => a.relationWithPlayer - b.relationWithPlayer)[0];
  if (worst && worst.relationWithPlayer < -20)
    out.push(
      court(
        worst.id,
        world.objective ? 40 : 60,
        `Relations ${Math.round(worst.relationWithPlayer)}. Lower the temperature before it boils over.`,
      ),
    );
  const friend = [...others]
    .filter((v) => v.relationWithPlayer > 45 && !player.alliances.includes(v.id))
    .sort((a, b) => b.relationWithPlayer - a.relationWithPlayer)[0];
  if (friend)
    out.push({
      p: 45,
      who: "Foreign Minister",
      label: `Offer pact to ${friend.name}`,
      why: `They like us (view ${Math.round(friend.relationWithPlayer)}). A defense pact deters our rivals.`,
      action: {
        type: "DIPLOMACY_PROPOSE_ALLIANCE",
        label: `Offer defense pact to ${friend.name}`,
        targetCountryId: friend.id,
      },
    });
  const nuke = others.find(
    (v) =>
      v.nuclearStatus === "DEVELOPING" &&
      (v.nuclearProgress?.estimate ?? 0) > 35 &&
      v.relationWithPlayer < -20,
  );
  if (nuke)
    out.push({
      p: 80,
      who: "Intelligence Chief",
      label: `Spy on ${nuke.name}`,
      why: `Their program may be ~${Math.round(nuke.nuclearProgress?.estimate ?? 0)}% along. We need certainty.`,
      action: { type: "INTEL_GATHER", label: `Spy on ${nuke.name}`, targetCountryId: nuke.id },
    });
  if (player.insurgencyLevel === "REBELLION" || player.insurgencyLevel === "GUERILLA")
    out.push({
      p: 78,
      who: "Interior Minister",
      label: "Soft policing",
      why: `Insurgency at ${player.insurgencyLevel.toLowerCase()}. Win hearts, not just streets: slow, but no backlash.`,
      action: { type: "DOMESTIC_POLICING", label: "Soft policing", params: { tactic: "SOFT" } },
    });
  const meddled = (report?.causes ?? []).some((c) => c.startsWith("Foreign covert"));
  const shielded = world.turn <= (world.director.counterIntelUntil ?? -1);
  if (meddled && !shielded)
    out.push({
      p: 92,
      who: "Intelligence Chief",
      label: "Hunt foreign spies",
      why: "Foreign agents were active last month. A spy hunt foils most of their operations for 3 months.",
      action: { type: "INTEL_COUNTER_INTEL", label: "Hunt foreign spies" },
    });
  if (out.length < 3 && !shielded)
    out.push({
      p: 10,
      who: "Intelligence Chief",
      label: "Hunt foreign spies",
      why: "Rivals are always probing. A spy hunt shields us for 3 months.",
      action: { type: "INTEL_COUNTER_INTEL", label: "Hunt foreign spies" },
    });
  // One suggestion per order: keep the highest-priority reason
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.p - a.p)
    .filter((s) => {
      if (seen.has(s.label)) return false;
      seen.add(s.label);
      return true;
    })
    .slice(0, limit)
    .map(({ p: _p, ...s }) => s);
}

/** " It fell 4 last month." when a stat dropped by 2 or more. */
function trendNote(world: WorldState, stat: string): string {
  const d = world.turnReport?.deltas?.[stat];
  if (!d) return "";
  const moved = Math.round(d.after - d.before);
  return moved <= -2 ? ` It fell ${-moved} last month.` : "";
}

// ----------------------------------------------------------------------------
// Crises: cabinet pick and mission pick
// ----------------------------------------------------------------------------

/** Good effects minus bad ones, weighted by size: how the effects read at a glance (ui format.ts). */
export function netScore(o: DecisionOption): number {
  let s = 0;
  const size = (v: number, scale = 1) => {
    const a = Math.abs(v) / scale;
    return a >= 9 ? 3 : a >= 4 ? 2 : 1;
  };
  const push = (v: number, scale = 1, goodWhenUp = true) => {
    if (!v) return;
    s += (v > 0 === goodWhenUp ? 1 : -1) * size(v, scale);
  };
  const e = o.effects;
  push(e.approval ?? 0);
  push(e.stability ?? 0);
  push(e.legitimacy ?? 0);
  push((e.gdp ?? 0) * 6 + (e.growth ?? 0) * 12);
  push(e.relationsAllies ?? 0, 0.7);
  for (const [k, v] of Object.entries(e)) {
    if (k.startsWith("relations:")) push(v, 1.4);
    if (k.startsWith("ceasefire:")) s += 3;
    if (!k.startsWith("hot:") || !v) continue;
    const what = k.split(":")[2];
    if (what === "war") s += v > 0 ? -3 : 3;
    else if (what === "violence" || what === "humanitarian") push(v, 1.5, false);
    else if (what === "aid") push(v, 2.5);
    else if (what === "governance" || what === "control") push(v, 1.5);
  }
  if (e.relationsRivals) push(e.relationsRivals, 0.7);
  if (e.mobilization) push(e.mobilization, 3);
  if (e.intel) push(e.intel, 3);
  if (e.pc) push(e.pc, 0.4);
  if (e.coupShield) s += 2;
  if (o.tensionDelta) push(o.tensionDelta, 0.8, false);
  for (const a of o.actions) {
    if (a.type === "DIPLOMACY_DECLARE_WAR") s -= 3;
    if (a.type === "MILITARY_AIRSTRIKE") s -= 2;
  }
  if (o.followUp) s -= 1;
  return s;
}

const backers = (o: DecisionOption) => o.backedBy?.length ?? 0;
const affordablePool = (d: PendingDecision, pcAvailable: number) => {
  const ok = d.options.filter(
    (o) => (o.effects.pc ?? 0) >= 0 || pcAvailable + (o.effects.pc ?? 0) >= 0,
  );
  return ok.length ? ok : d.options;
};

/**
 * The cabinet pick: the cabinet's consensus. The option most advisors back; ties go to the better
 * net effect, then not the "do nothing" default, then the cheaper one; never one that overdraws the
 * month's capital. It can hurt the mission: only ANALYST keeps the old safety net (no option that
 * works against an objective or takes the country to war, when another exists).
 */
export function cabinetPick(
  world: WorldState,
  d: PendingDecision,
  pcAvailable = 99,
  ctx: ImpactContext | null = impactContext(world),
): DecisionOption {
  const pool = affordablePool(d, pcAvailable);
  let candidates = pool;
  if (world.difficulty === "ANALYST") {
    const safe = pool.filter(
      (o) =>
        !againstMission(optionImpact(world, o, ctx), true) &&
        !o.actions.some((a) => a.type === "DIPLOMACY_DECLARE_WAR"),
    );
    if (safe.length) candidates = safe;
  }
  return [...candidates].sort(
    (a, b) =>
      backers(b) - backers(a) ||
      netScore(b) - netScore(a) ||
      Number(a.id === d.defaultOptionId) - Number(b.id === d.defaultOptionId) ||
      -(a.effects.pc ?? 0) + (b.effects.pc ?? 0),
  )[0];
}

/** Net effect on the primary goals only: +3 per goal helped, -4 per goal hurt, -20 per goal broken. */
export function primaryScore(impact: Impact): number {
  return 3 * impact.helps.length - 4 * impact.hurts.length - 20 * impact.breaks.length;
}

/** Net effect on the bonus goals (the tie-break after the primary goals). */
function bonusScore(impact: Impact): number {
  return impact.score - primaryScore(impact);
}

/**
 * The mission pick: the affordable option with the best net effect on the primary goals, then on
 * the bonus goals; ties by net effect, then the cabinet's own pick.
 */
export function missionPick(
  world: WorldState,
  d: PendingDecision,
  pcAvailable = 99,
  ctx: ImpactContext | null = impactContext(world),
): DecisionOption {
  const pool = affordablePool(d, pcAvailable);
  const cabinet = cabinetPick(world, d, pcAvailable, ctx);
  const impact = new Map(pool.map((o) => [o.id, optionImpact(world, o, ctx)]));
  const p = (o: DecisionOption) => primaryScore(impact.get(o.id) as Impact);
  const b = (o: DecisionOption) => bonusScore(impact.get(o.id) as Impact);
  return [...pool].sort(
    (x, y) =>
      p(y) - p(x) ||
      b(y) - b(x) ||
      netScore(y) - netScore(x) ||
      Number(y.id === cabinet.id) - Number(x.id === cabinet.id),
  )[0];
}

const listWords = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

/**
 * What the desk may honestly say about the mission pick. "Best for your mission" only when the
 * pick hurts no primary goal; a pick that helps one goal and costs another is a named trade-off;
 * one that only costs less than the rest is the least harm. No note when every option is equal on
 * the mission. The switch offer names a goal the cabinet pick hurts and the mission pick does not.
 */
export function missionNote(
  world: WorldState,
  d: PendingDecision,
  pcAvailable = 99,
  ctx: ImpactContext | null = impactContext(world),
  cabinet: DecisionOption = cabinetPick(world, d, pcAvailable, ctx),
): MissionNote | null {
  const pool = affordablePool(d, pcAvailable);
  const pick = missionPick(world, d, pcAvailable, ctx);
  const impactOf = (o: DecisionOption) => optionImpact(world, o, ctx);
  const mine = impactOf(pick);
  const scores = pool.map((o) => primaryScore(impactOf(o)) * 100 + bonusScore(impactOf(o)));
  const best = primaryScore(mine) * 100 + bonusScore(mine);
  if (scores.every((s) => s === best)) return null; // nothing to choose between on the mission
  const costs = [...mine.breaks, ...mine.hurts];
  const helps = mine.helps.length ? mine.helps : mine.bonusHelps;
  const kind: MissionNote["kind"] = costs.length ? (helps.length ? "tradeoff" : "least") : "best";
  const text =
    kind === "best"
      ? "Best for your mission"
      : kind === "tradeoff"
        ? `Best trade-off: helps ${listWords(helps)}, costs ${listWords(costs)}`
        : `Least harm to your mission (costs ${listWords(costs)})`;
  let switchFrom: MissionNote["switchFrom"] = null;
  if (cabinet.id !== pick.id) {
    const cab = impactOf(cabinet);
    const pickHarms = new Set(costs);
    const goal = [...cab.breaks, ...cab.hurts].find((g) => !pickHarms.has(g));
    if (goal && primaryScore(mine) > primaryScore(cab))
      switchFrom = { cabinetId: cabinet.id, goal, breaks: cab.breaks.includes(goal) };
  }
  return { optionId: pick.id, kind, text, helps, costs, switchFrom };
}

// ----------------------------------------------------------------------------
// Meetings
// ----------------------------------------------------------------------------

/** The answer the staff suggest for a meeting (never the deputy; free answers first). */
export function meetingSuggestion(m: Meeting): DecisionOption | undefined {
  const pool = m.options.filter((o) => o.id !== m.defaultOptionId);
  return [...pool].sort(
    (a, b) =>
      Number((b.effects.pc ?? 0) >= 0) - Number((a.effects.pc ?? 0) >= 0) ||
      netScore(b) - netScore(a),
  )[0];
}

const KIND_RANK: Record<Meeting["kind"], number> = { VISIT: 0, CALL: 1, STAFF: 2, PRESS: 3 };

/** Which meetings to attend in person first: emergencies, mission countries, then visits, calls, staff, press. */
export function meetingPriority(
  agenda: Meeting[],
  objective: Objective | null | undefined,
): Meeting[] {
  const missionIds = new Set(
    [...(objective?.primary ?? []), ...(objective?.bonus ?? [])]
      .map((c) => c.targetId)
      .filter(Boolean),
  );
  const rank = (m: Meeting) => {
    const s = meetingSuggestion(m);
    return (
      (m.urgency === "URGENT" || m.urgency === "EXISTENTIAL" ? -20 : 0) +
      (m.withCountry && missionIds.has(m.withCountry) ? -10 : 0) +
      KIND_RANK[m.kind] -
      (s ? netScore(s) / 10 : 0)
    );
  };
  return [...agenda].sort((a, b) => rank(a) - rank(b));
}

/** The meetings the staff would attend (within the slots and the capital), the rest to deputies. */
export function meetingPlan(
  world: WorldState,
  pcAvailable: number,
): { picks: Record<string, string>; deputies: string[] } {
  const picks: Record<string, string> = {};
  let free = MEETING_SLOTS;
  let pc = Math.max(0, pcAvailable);
  for (const m of meetingPriority(world.agenda ?? [], world.objective)) {
    if (free <= 0) break;
    const o = meetingSuggestion(m);
    if (!o) continue;
    const cost = -(o.effects.pc ?? 0);
    if (cost > 0 && cost > pc) continue;
    pc -= Math.max(0, cost);
    picks[m.id] = o.id;
    free--;
  }
  const deputies = (world.agenda ?? [])
    .filter((m) => !picks[m.id] && m.defaultOptionId)
    .map((m) => m.id);
  return { picks, deputies };
}

// ----------------------------------------------------------------------------
// Staff orders
// ----------------------------------------------------------------------------

/** Months (turns) in which the player carried out an order of this type, recent first. */
function orderTurns(world: WorldState, type: string): number[] {
  const turns = new Set((world.director.ledger[type] ?? []).map((e) => e.turn));
  const report = world.turnReport;
  if (report?.orders.some((o) => o.type === type)) turns.add(report.turn);
  return [...turns].sort((a, b) => b - a);
}

/**
 * Staff variety: never the same order type two months running, nor more than twice in any four
 * months (design-month 5.2).
 */
export function staffMayRepeat(world: WorldState, type: string): boolean {
  const turns = orderTurns(world, type);
  if (turns.includes(world.turn - 1)) return false;
  return turns.filter((t) => t >= world.turn - 3).length < 2;
}

/** How many times this order type ran in the last six months (for "3rd in 6 months"). */
export function recentUses(world: WorldState, type: string): number {
  return orderTurns(world, type).filter((t) => t >= world.turn - 6).length;
}

/**
 * The orders the staff propose: the top suggestions that are safe (not dangerous, no mission
 * warning, decent odds), varied, affordable after the crisis picks and leaving RESERVE_PC. They
 * run only once approved (Approve all approves every one that still fits, as the harness does).
 */
export function staffOrders(
  world: WorldState,
  pcAvailable: number,
  suggestions?: Suggestion[],
): StaffOrder[] {
  const out: StaffOrder[] = [];
  const lastLabels = new Set((world.turnReport?.orders ?? []).map((o) => o.label));
  let pc = pcAvailable;
  for (const s of suggestions ?? computeSuggestions(world)) {
    if (out.length >= STAFF_ORDERS) break;
    if (DANGEROUS.has(s.action.type)) continue;
    if (
      out.some(
        (o) =>
          o.action.type === s.action.type && o.action.targetCountryId === s.action.targetCountryId,
      )
    )
      continue;
    if (lastLabels.has(s.action.label) || !staffMayRepeat(world, s.action.type)) continue;
    const cost = actionCostPC(s.action);
    if (cost > pc - RESERVE_PC) continue;
    const preview = previewAction(world, s.action);
    if (preview.blocked || preview.missionWarning) continue;
    if (preview.successChance !== null && preview.successChance < MIN_ODDS) continue;
    out.push({ ...s, successChance: preview.successChance });
    pc -= cost;
  }
  return out;
}

// ----------------------------------------------------------------------------
// The month's advice and the goal line
// ----------------------------------------------------------------------------

/** The cabinet's plan for the month: crisis picks paid in order, staff orders, then meetings. */
export function buildAdvice(world: WorldState): Advice {
  const ctx = impactContext(world);
  const suggestions = computeSuggestions(world);
  const cabinetPicks: Record<string, string> = {};
  const missionPicks: Record<string, string> = {};
  const missionNotes: Record<string, MissionNote> = {};
  let pc = world.politicalCapital;
  let pcMission = pc;
  for (const d of world.pendingDecisions) {
    const c = cabinetPick(world, d, pc, ctx);
    cabinetPicks[d.id] = c.id;
    const note = missionNote(world, d, pcMission, ctx, c);
    if (note) missionNotes[d.id] = note;
    pc += c.effects.pc ?? 0;
    const m = missionPick(world, d, pcMission, ctx);
    missionPicks[d.id] = m.id;
    pcMission += m.effects.pc ?? 0;
  }
  const orders = staffOrders(world, pc, suggestions);
  const spent = orders.reduce((s, o) => s + actionCostPC(o.action), 0);
  const meetings = meetingPlan(world, pc - spent);
  return {
    suggestions,
    cabinetPicks,
    missionPicks,
    meetingPicks: meetings.picks,
    deputies: meetings.deputies,
    staffOrders: orders,
    missionNotes,
  };
}

/** Mission impact of every option on the desk: decision or meeting id → option id → impact. */
export function deskImpact(world: WorldState): Record<string, Record<string, Impact>> {
  const ctx = impactContext(world);
  const out: Record<string, Record<string, Impact>> = {};
  for (const d of [...world.pendingDecisions, ...(world.agenda ?? [])]) {
    out[d.id] = Object.fromEntries(d.options.map((o) => [o.id, optionImpact(world, o, ctx)]));
  }
  return out;
}

/** Mission impact of each suggested order, by its label. */
export function suggestionImpact(
  world: WorldState,
  suggestions: Suggestion[],
): Record<string, Impact> {
  const ctx = impactContext(world);
  return Object.fromEntries(suggestions.map((s) => [s.label, actionImpact(world, s.action, ctx)]));
}

/**
 * The goal line: objectiveStatus plus, per objective, what on this month's desk helps it, and the
 * month's step (the off-track primary goal with the largest gap that something on the desk moves).
 */
export function missionStatus(world: WorldState, suggestions?: Suggestion[]): ConditionStatus[] {
  const statuses = objectiveStatus(world);
  if (statuses.length === 0) return statuses;
  const ctx = impactContext(world);
  const helps: ObjectiveHelp[][] = statuses.map(() => []);
  const add = (links: Impact["links"], h: ObjectiveHelp) => {
    for (const l of links)
      if (l.effect === "helps" && helps[l.index].length < 4) helps[l.index].push(h);
  };
  for (const d of world.pendingDecisions)
    for (const o of d.options)
      add(optionImpact(world, o, ctx).links, {
        kind: "crisis",
        id: d.id,
        optionId: o.id,
        label: o.label,
      });
  for (const m of world.agenda ?? [])
    for (const o of m.options)
      if (o.id !== m.defaultOptionId)
        add(optionImpact(world, o, ctx).links, {
          kind: "meeting",
          id: m.id,
          optionId: o.id,
          label: o.label,
        });
  for (const s of suggestions ?? computeSuggestions(world)) {
    const { label: _l, ...action } = s.action;
    if (missionWarning(world, action)) continue;
    add(actionImpact(world, action, ctx).links, { kind: "order", label: s.label, action });
  }
  const step = stepIndex(statuses, helps);
  return statuses.map((s, i) => ({
    ...s,
    helps: helps[i],
    ...(i === step ? { step: true } : {}),
  }));
}

/** The month's step objective: unmet primary first (else bonus), largest relative gap, movable. */
export function stepIndex(
  statuses: ConditionStatus[],
  helps?: ObjectiveHelp[][],
): number | undefined {
  const gap = (s: ConditionStatus) =>
    s.now !== undefined && s.need !== undefined
      ? (s.need - s.now) / Math.max(10, Math.abs(s.need))
      : 0.5;
  const pickFrom = (bonus: boolean) =>
    statuses
      .map((s, i) => ({ s, i }))
      .filter(
        ({ s, i }) =>
          s.bonus === bonus && !s.met && !s.failed && (helps === undefined || helps[i].length > 0),
      )
      .sort((a, b) => gap(b.s) - gap(a.s) || a.i - b.i)[0]?.i;
  return pickFrom(false) ?? pickFrom(true);
}

/** The step objective at the start of a month (for the turn report), without the desk scan. */
export function monthStep(world: WorldState): number | undefined {
  const statuses = objectiveStatus(world);
  return statuses.length ? stepIndex(statuses) : undefined;
}
