import type { Action, CountryState, ObjectiveCondition, WorldState } from "./types.js";

/**
 * Objectives give every session a clear win condition. Flashpoints are
 * authored with specific goals ("keep Iran from testing a bomb without
 * starting a war"); Term and Legacy fall back to survival plus par score.
 */

const NUCLEAR_ORDER = ["NONE", "LATENT", "DEVELOPING", "TESTED", "ARMED"] as const;

export type ObjectiveState = "on_track" | "close" | "off_track" | "failed";
export type ObjectiveUnit = "%" | "front" | "score" | "view";

/** Something on this month's desk that moves an objective (filled by advisors.ts missionHelps). */
export interface ObjectiveHelp {
  kind: "crisis" | "meeting" | "order";
  id?: string; // decision or meeting id
  optionId?: string; // the option that helps
  label: string;
  action?: Action; // orders: the action to queue
}

export interface ConditionStatus {
  label: string;
  met: boolean;
  failed: boolean; // irrecoverably failed (ends a flashpoint early)
  bonus: boolean;
  // The goal line (design-month 3.3): where it stands, what it needs, how it moved
  short?: string;
  now?: number;
  need?: number;
  unit?: ObjectiveUnit;
  trend?: number; // change over last month
  state?: ObjectiveState;
  helps?: ObjectiveHelp[];
  step?: boolean; // this month's step: the off-track goal with the largest gap the desk can move
}

/** The goal-chip label: the authored `short`, else the label up to the first "(" or ":". */
export function shortLabel(cond: ObjectiveCondition): string {
  if (cond.short) return cond.short;
  const cut = cond.label.split(/[(:]/)[0].trim();
  return cut || cond.label;
}

/** The number a condition is judged on, the number it needs and its unit (null when none). */
export function conditionMeasure(
  world: WorldState,
  cond: ObjectiveCondition,
): { now: number; need: number; unit: ObjectiveUnit } | null {
  const me = player(world);
  if (!me) return null;
  switch (cond.kind) {
    case "STAT_MIN":
      return { now: me[cond.stat ?? "approval"], need: cond.min ?? 50, unit: "%" };
    case "RELATION_MIN":
      return { now: me.relations[cond.targetId ?? ""] ?? 0, need: cond.min ?? 0, unit: "view" };
    case "SCORE_PAR":
      return {
        now: world.score.total,
        need: cond.min ?? world.objective?.par ?? 100,
        unit: "score",
      };
    case "WAR_RESULT": {
      const war = world.wars.find(
        (w) =>
          (w.attackerId === me.id && w.defenderId === cond.targetId) ||
          (w.defenderId === me.id && w.attackerId === cond.targetId),
      );
      if (!war) return null;
      const front = war.attackerId === me.id ? war.frontline : 100 - war.frontline;
      return { now: front, need: cond.min ?? 50, unit: "front" };
    }
    default:
      return null;
  }
}

/** How close an unmet goal counts as "close": within 15% of the need, or 8 front, 15 view. */
const CLOSE: Record<ObjectiveUnit, (need: number) => number> = {
  "%": (need) => Math.max(3, Math.abs(need) * 0.15),
  score: (need) => Math.abs(need) * 0.15,
  front: () => 8,
  view: () => 15,
};

function objectiveState(
  s: ConditionStatus,
  measure: ReturnType<typeof conditionMeasure>,
  trend: number | undefined,
  monthsLeft: number,
): ObjectiveState {
  if (s.failed) return "failed";
  if (s.met) return "on_track";
  if (!measure) return "off_track";
  const gap = measure.need - measure.now;
  if (gap <= CLOSE[measure.unit](measure.need)) return "close";
  if (trend !== undefined && trend > 0 && trend * Math.max(1, monthsLeft) >= gap) return "close";
  return "off_track";
}

function player(world: WorldState): CountryState | undefined {
  return world.countries.find((c) => c.id === world.playerCountryId);
}

export function evaluateCondition(
  world: WorldState,
  cond: ObjectiveCondition,
  bonus: boolean,
): ConditionStatus {
  const me = player(world);
  const target = cond.targetId ? world.countries.find((c) => c.id === cond.targetId) : undefined;
  const status = (met: boolean, failed = false): ConditionStatus => ({
    label: cond.label,
    met,
    failed,
    bonus,
  });
  if (!me) return status(false, true);

  switch (cond.kind) {
    case "SURVIVE":
      return status(stayedInPower(world));
    case "NO_NUCLEAR": {
      if (!target) return status(true);
      const max = NUCLEAR_ORDER.indexOf(cond.maxStatus ?? "DEVELOPING");
      const reached = NUCLEAR_ORDER.indexOf(target.nuclear.status) > max;
      return status(!reached, reached);
    }
    case "NO_WAR_WITH": {
      if (!target) return status(true);
      const fought = me.atWarWith.includes(target.id) || hasFought(world, me.id, target.id);
      return status(!fought, fought);
    }
    case "WAR_RESULT": {
      if (!target) return status(true);
      const war = world.wars.find(
        (w) =>
          (w.attackerId === me.id && w.defenderId === target.id) ||
          (w.defenderId === me.id && w.attackerId === target.id),
      );
      if (!war) return status(true); // war ended (ceasefire or victory)
      const fromPlayer = war.attackerId === me.id ? war.frontline : 100 - war.frontline;
      return status(fromPlayer >= (cond.min ?? 50));
    }
    case "STAT_MIN": {
      const value = me[cond.stat ?? "approval"];
      return status(value >= (cond.min ?? 50));
    }
    case "RELATION_MIN":
      return status((me.relations[cond.targetId ?? ""] ?? 0) >= (cond.min ?? 0));
    case "SCORE_PAR":
      return status(world.score.total >= (cond.min ?? world.objective?.par ?? 100));
    case "NOT_COLLAPSED":
      return status(!!target && !target.collapsed, !!target?.collapsed);
    case "WAR_ENDED": {
      const a = cond.targetId;
      const b = cond.otherId;
      const ongoing = world.wars.some(
        (w) =>
          (w.attackerId === a && w.defenderId === b) || (w.attackerId === b && w.defenderId === a),
      );
      return status(!ongoing);
    }
    case "INSURGENCY_MAX": {
      const order = ["NONE", "UNREST", "REBELLION", "GUERILLA"];
      return status(order.indexOf(me.insurgencyLevel) <= order.indexOf(cond.level ?? "UNREST"));
    }
    default:
      return status(false);
  }
}

/** Still in office: only depositions, collapse and nuclear holocaust remove the player. */
export function stayedInPower(world: WorldState): boolean {
  return !world.gameOver || STILL_IN_OFFICE.includes(world.gameOver.reason);
}
const STILL_IN_OFFICE: string[] = ["TERM_COMPLETED", "OBJECTIVE_FAILED"];

function hasFought(world: WorldState, a: string, b: string): boolean {
  return world.timeline.some(
    (t) =>
      t.category === "WAR" &&
      t.description.startsWith("WAR:") &&
      t.description.includes(world.countries.find((c) => c.id === a)?.name ?? a) &&
      t.description.includes(world.countries.find((c) => c.id === b)?.name ?? b),
  );
}

/** Every objective condition in order: primary first, then bonus. */
export function objectiveConditions(
  world: WorldState,
): Array<{ cond: ObjectiveCondition; bonus: boolean }> {
  if (!world.objective) return [];
  return [
    ...world.objective.primary.map((cond) => ({ cond, bonus: false })),
    ...world.objective.bonus.map((cond) => ({ cond, bonus: true })),
  ];
}

/** Each condition's measured value now (null when it has no number), in objectiveStatus order. */
export function missionValues(world: WorldState): Array<number | null> {
  return objectiveConditions(world).map(({ cond }) => {
    const m = conditionMeasure(world, cond);
    return m ? Math.round(m.now * 10) / 10 : null;
  });
}

/**
 * Where every objective stands: met/failed plus the goal-line fields (short label, now, need,
 * unit, trend over last month, state). `helps` and `step` are added by advisors.ts.
 */
export function objectiveStatus(world: WorldState): ConditionStatus[] {
  const before = world.turnReport?.missionBefore;
  const monthsLeft = world.maxTurns - world.turn;
  return objectiveConditions(world).map(({ cond, bonus }, i) => {
    const s = evaluateCondition(world, cond, bonus);
    const m = conditionMeasure(world, cond);
    const was = before?.[i];
    const trend =
      m && was !== undefined && was !== null ? Math.round((m.now - was) * 10) / 10 : undefined;
    return {
      ...s,
      short: shortLabel(cond),
      ...(m ? { now: Math.round(m.now * 10) / 10, need: m.need, unit: m.unit } : {}),
      ...(trend !== undefined ? { trend } : {}),
      state: objectiveState(s, m, trend, monthsLeft),
    };
  });
}

/** The survival condition every session carries beside its objectives. */
export const STAY_IN_POWER = "Stay in power";

/** Stars: 0 = failed; 1 = primary objectives met; +1 per bonus met (max 3). */
export function computeOutcome(world: WorldState): NonNullable<WorldState["outcome"]> {
  const survived = stayedInPower(world);
  const statuses = objectiveStatus(world);
  const primary = statuses.filter((s) => !s.bonus);
  const bonuses = statuses.filter((s) => s.bonus);
  const primaryMet = survived && primary.every((s) => s.met);
  let stars = 0;
  if (primaryMet) {
    stars = 1 + Math.min(2, bonuses.filter((s) => s.met).length);
    if (!world.objective) stars = world.score.total >= 130 ? 3 : world.score.total >= 105 ? 2 : 1;
  }
  return {
    victory: primaryMet,
    stars,
    conditions: [
      { label: STAY_IN_POWER, met: survived, bonus: false },
      ...statuses.map((s) => ({ label: s.label, met: s.met, bonus: s.bonus })),
    ],
  };
}

export function earlyFailure(world: WorldState): ConditionStatus | undefined {
  return objectiveStatus(world).find((s) => !s.bonus && s.failed);
}
