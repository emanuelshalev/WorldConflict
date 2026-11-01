import { monthlyDefenseBudgetM } from "./systems/military.js";
import type { Action, ActionType, CountryState, WorldState } from "./types.js";

/**
 * Action economy. The player's orders cost Political Capital (PC) — the scarce
 * attention, favors and credibility a leader spends each month — while
 * military hardware and nuclear work cost money as a share of the defense
 * budget. Percentages instead of flat dollars keep a 1960 Israel and a 2025
 * United States equally constrained (flat costs paralysed the former and
 * meant nothing to the latter).
 */
export const PC_COSTS: Partial<Record<ActionType, number>> = {
  DIPLOMACY_IMPROVE_RELATIONS: 1,
  DIPLOMACY_DENOUNCE: 0,
  DIPLOMACY_PROPOSE_ALLIANCE: 2,
  DIPLOMACY_BREAK_ALLIANCE: 1,
  DIPLOMACY_DECLARE_WAR: 2,
  DIPLOMACY_PROPOSE_CEASEFIRE: 1,
  DIPLOMACY_MEDIATE: 2,
  MILITARY_MOBILIZE: 1,
  MILITARY_AIRSTRIKE: 1,
  NUCLEAR_FUND_PROGRAM: 1,
  ECONOMY_ADJUST_MILITARY_BUDGET: 1,
  INTEL_GATHER: 1,
  INTEL_COUNTER_INTEL: 1,
  INTEL_PROPAGANDA: 1,
  INTEL_SABOTAGE: 2,
  INTEL_DESTABILIZE: 2,
  INTEL_SUPPORT_REBELS: 2,
  INTEL_MISINFORMATION: 2,
  INTEL_ASSASSINATE: 3,
  INTEL_COUP: 3,
  DOMESTIC_PROPAGANDA: 1,
  DOMESTIC_REFORM: 2,
};

/** Share of the monthly defense budget consumed by military/nuclear orders. */
export const BUDGET_SHARE: Partial<Record<ActionType, number>> = {
  MILITARY_MOBILIZE: 0.12,
  MILITARY_PROCURE: 0.3,
  MILITARY_AIRSTRIKE: 0.08,
  MILITARY_DEPLOY_BORDER: 0.06,
  NUCLEAR_FUND_PROGRAM: 0.15,
};

export const PC_CAP = 6;

export function actionCostPC(action: Action): number {
  return PC_COSTS[action.type] ?? 0;
}

/** Money cost in $M. Procurement may specify an explicit amount in `value`. */
export function actionCostM(action: Action, actor?: CountryState): number {
  if (action.type === "MILITARY_PROCURE" && action.value) return action.value;
  const share = BUDGET_SHARE[action.type];
  if (!share) return 0;
  if (!actor) return 0;
  return Math.round(share * monthlyDefenseBudgetM(actor));
}

/** Political Capital earned this month. */
export function politicalCapitalIncome(world: WorldState, player: CountryState): number {
  let pc = 3;
  if (world.difficulty === "ANALYST") pc += 1;
  if (player.approval > 70) pc += 1;
  if (player.approval < 35) pc -= 1;
  if (player.legitimacy < 30) pc -= 1;
  return Math.max(1, pc);
}
