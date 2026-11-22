/**
 * Explaining the month (design-month 6): what the player's choices moved versus the drift, the
 * delayed outcomes set up and come due, the month's step objective, and which cards repeat last
 * month's. Pure reads plus report writes, no RNG; called once per turn from turn.ts.
 */
import { monthStep, recentUses } from "./advisors.js";
import { missionValues } from "./objectives.js";
import type { PendingDecision, PlayerTurnReport, WorldState } from "./types.js";

export interface MonthStart {
  missionBefore: Array<number | null>;
  step: number | undefined;
  pending: PendingDecision[];
}

/** The mission picture and the desk at the start of the month (read before anything resolves). */
export function beginMonth(world: WorldState): MonthStart {
  return {
    missionBefore: missionValues(world),
    step: monthStep(world),
    pending: world.pendingDecisions,
  };
}

const STATS: Array<[key: string, label: string]> = [
  ["approval", "Approval"],
  ["stability", "Stability"],
  ["legitimacy", "Legitimacy"],
];

/** Fills the report's explanation fields. `world.turnReport` is still last month's report here. */
export function explainMonth(
  world: WorldState,
  report: PlayerTurnReport,
  start: MonthStart | null,
): void {
  if (start) {
    if (start.missionBefore.length) report.missionBefore = start.missionBefore;
    if (start.step !== undefined) report.stepObjective = start.step;
  }

  // Choice versus drift: the measured effect of every decision and order, the rest is drift
  const drift: Record<string, number> = {};
  const facts = [
    ...report.decisions.flatMap((d) => d.facts ?? []),
    ...report.orders.flatMap((o) => o.facts ?? []),
  ];
  for (const [key, label] of STATS) {
    const d = report.deltas[key];
    if (!d) continue;
    const choice = facts
      .filter((f) => f.label === label)
      .reduce((s, f) => s + (f.after - f.before), 0);
    drift[key] = Math.round((d.after - d.before - choice) * 10) / 10;
  }
  report.drift = drift;

  // Delayed outcomes this month's choices set up
  const followUps: NonNullable<PlayerTurnReport["followUps"]> = [];
  for (const d of report.decisions) {
    if (d.kind !== "CRISIS" || !d.optionId) continue;
    const pending = start?.pending.find(
      (p) => p.title === d.title && p.templateId === d.templateId,
    );
    const option = pending?.options.find((o) => o.id === d.optionId);
    if (option?.followUp)
      followUps.push({
        title: d.title,
        due: world.turn + option.followUp.delay,
        templateId: option.followUp.templateId,
      });
  }
  if (followUps.length) report.followUps = followUps;

  // Repeats: the same item with the same result as last month collapses on the debrief
  const prev = world.turnReport;
  const firstSign = (f?: Array<{ before: number; after: number }>) =>
    f?.[0] ? Math.sign(f[0].after - f[0].before) : 0;
  for (const o of report.orders) {
    if (o.ok && o.type) {
      const n = recentUses({ ...world, turn: world.turn + 1 }, o.type);
      if (n > 1) o.again = n;
    }
    if (
      prev?.orders.some(
        (p) => p.label === o.label && p.ok === o.ok && firstSign(p.facts) === firstSign(o.facts),
      )
    )
      o.repeat = true;
  }
  for (const d of report.decisions) {
    if (
      prev?.decisions.some(
        (p) =>
          p.kind === d.kind &&
          p.templateId === d.templateId &&
          p.withCountry === d.withCountry &&
          p.choice === d.choice,
      )
    )
      d.repeat = true;
  }
  const repeated = report.causes.filter((c) => prev?.causes.includes(c));
  if (repeated.length) report.causesRepeated = repeated;
}
