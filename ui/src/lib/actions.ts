import { ORDERS } from './orders';

// Political capital (◆) per order. Mirrors src/core/costs.ts PC_COSTS.
export const PC: Record<string, number> = {
  DIPLOMACY_IMPROVE_RELATIONS: 1,
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
export const pcCost = (type: string) => PC[type] ?? 0;

/**
 * One vocabulary for orders everywhere (desk catalog, dossier, previews), derived from the
 * order registry (lib/orders.ts). Targeted labels read as "<verb> <country>"; for an order type
 * with variants (airstrikes, policing) this is the first variant's verb.
 */
export const ACTION_VERBS: Record<string, string> = ORDERS.reduce<Record<string, string>>((verbs, o) => {
  verbs[o.type] ??= o.verb;
  return verbs;
}, {});
export const actionLabel = (type: string, targetName?: string) =>
  targetName && ACTION_VERBS[type] ? `${ACTION_VERBS[type]} ${targetName}` : (ACTION_VERBS[type] ?? type);
