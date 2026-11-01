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
 * One vocabulary for orders everywhere (desk catalog, dossier, previews).
 * Targeted labels read as "<verb> <country>".
 */
export const ACTION_VERBS: Record<string, string> = {
  DIPLOMACY_IMPROVE_RELATIONS: 'Court',
  DIPLOMACY_DENOUNCE: 'Denounce',
  DIPLOMACY_PROPOSE_ALLIANCE: 'Offer defense pact to',
  DIPLOMACY_PROPOSE_CEASEFIRE: 'Propose ceasefire to',
  DIPLOMACY_MEDIATE: 'Mediate peace for',
  DIPLOMACY_BREAK_ALLIANCE: 'Break pact with',
  DIPLOMACY_DECLARE_WAR: 'Declare war on',
  MILITARY_DEPLOY_BORDER: 'Mass troops facing',
  MILITARY_WITHDRAW_BORDER: 'Withdraw troops facing',
  INTEL_GATHER: 'Spy on',
  INTEL_SABOTAGE: 'Sabotage',
  INTEL_DESTABILIZE: 'Destabilize',
  INTEL_SUPPORT_REBELS: 'Arm rebels in',
  INTEL_MISINFORMATION: 'Feed disinformation to',
  INTEL_ASSASSINATE: 'Assassinate leader of',
  INTEL_COUP: 'Back a coup in',
};
export const actionLabel = (type: string, targetName?: string) =>
  targetName && ACTION_VERBS[type] ? `${ACTION_VERBS[type]} ${targetName}` : (ACTION_VERBS[type] ?? type);
