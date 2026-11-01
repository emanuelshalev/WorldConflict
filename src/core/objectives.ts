import type { CountryState, ObjectiveCondition, WorldState } from "./types.js";

/**
 * Objectives give every session a clear win condition. Flashpoints are
 * authored with specific goals ("keep Iran from testing a bomb without
 * starting a war"); Term and Legacy fall back to survival plus par score.
 */

const NUCLEAR_ORDER = ["NONE", "LATENT", "DEVELOPING", "TESTED", "ARMED"] as const;

export interface ConditionStatus {
  label: string;
  met: boolean;
  failed: boolean; // irrecoverably failed (ends a flashpoint early)
  bonus: boolean;
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
      return status(!world.gameOver || world.gameOver.reason === "TERM_COMPLETED");
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

function hasFought(world: WorldState, a: string, b: string): boolean {
  return world.timeline.some(
    (t) =>
      t.category === "WAR" &&
      t.description.startsWith("WAR:") &&
      t.description.includes(world.countries.find((c) => c.id === a)?.name ?? a) &&
      t.description.includes(world.countries.find((c) => c.id === b)?.name ?? b),
  );
}

export function objectiveStatus(world: WorldState): ConditionStatus[] {
  if (!world.objective) return [];
  return [
    ...world.objective.primary.map((c) => evaluateCondition(world, c, false)),
    ...world.objective.bonus.map((c) => evaluateCondition(world, c, true)),
  ];
}

/** Stars: 0 = failed; 1 = primary objectives met; +1 per bonus met (max 3). */
export function computeOutcome(world: WorldState): NonNullable<WorldState["outcome"]> {
  const survived = !world.gameOver || ["TERM_COMPLETED"].includes(world.gameOver.reason);
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
      { label: "Stay in power", met: survived, bonus: false },
      ...statuses.map((s) => ({ label: s.label, met: s.met, bonus: s.bonus })),
    ],
  };
}

export function earlyFailure(world: WorldState): ConditionStatus | undefined {
  return objectiveStatus(world).find((s) => !s.bonus && s.failed);
}
