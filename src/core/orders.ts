import type { ActionType } from "./types.js";

/**
 * The player's order list, owned by the engine as data. The UI registry
 * (`ui/src/lib/orders.ts`) adds presentation (family, relevance, blurb) keyed
 * by `id`; `tests/ui-orders-parity.spec.ts` checks both lists stay identical.
 * One label everywhere: `${verb} ${target}` for targeted orders, `verb` otherwise.
 */
export interface EngineOrderDef {
  /** Stable id, used for keys, tests and the order menu. */
  id: string;
  type: ActionType;
  params?: Record<string, unknown>;
  /** "Strike nuclear sites in": the full label is `${verb} ${target}`. Untargeted: the label. */
  verb: string;
  targeted: boolean;
  /** Declare war and nuclear strike: the UI asks for an explicit second action. */
  irreversible?: boolean;
}

export const ENGINE_ORDERS: readonly EngineOrderDef[] = [
  // Diplomacy
  { id: "court", type: "DIPLOMACY_IMPROVE_RELATIONS", verb: "Court", targeted: true },
  { id: "denounce", type: "DIPLOMACY_DENOUNCE", verb: "Denounce", targeted: true },
  {
    id: "offer-pact",
    type: "DIPLOMACY_PROPOSE_ALLIANCE",
    verb: "Offer defense pact to",
    targeted: true,
  },
  {
    id: "ceasefire",
    type: "DIPLOMACY_PROPOSE_CEASEFIRE",
    verb: "Propose ceasefire to",
    targeted: true,
  },
  { id: "mediate", type: "DIPLOMACY_MEDIATE", verb: "Mediate peace for", targeted: true },
  { id: "break-pact", type: "DIPLOMACY_BREAK_ALLIANCE", verb: "Break pact with", targeted: true },
  {
    id: "declare-war",
    type: "DIPLOMACY_DECLARE_WAR",
    verb: "Declare war on",
    targeted: true,
    irreversible: true,
  },
  // Military
  { id: "mobilize", type: "MILITARY_MOBILIZE", verb: "Mobilize forces", targeted: false },
  { id: "demobilize", type: "MILITARY_DEMOBILIZE", verb: "Stand down forces", targeted: false },
  { id: "procure", type: "MILITARY_PROCURE", verb: "Buy weapons", targeted: false },
  {
    id: "deploy-border",
    type: "MILITARY_DEPLOY_BORDER",
    verb: "Mass troops facing",
    targeted: true,
  },
  {
    id: "withdraw-border",
    type: "MILITARY_WITHDRAW_BORDER",
    verb: "Withdraw troops facing",
    targeted: true,
  },
  {
    id: "airstrike-military",
    type: "MILITARY_AIRSTRIKE",
    params: { targetType: "MILITARY" },
    verb: "Strike military targets in",
    targeted: true,
  },
  {
    id: "airstrike-nuclear",
    type: "MILITARY_AIRSTRIKE",
    params: { targetType: "NUCLEAR" },
    verb: "Strike nuclear sites in",
    targeted: true,
  },
  {
    id: "fund-nuclear",
    type: "NUCLEAR_FUND_PROGRAM",
    verb: "Fund nuclear program",
    targeted: false,
  },
  {
    id: "nuclear-strike",
    type: "NUCLEAR_STRIKE",
    verb: "Nuclear strike on",
    targeted: true,
    irreversible: true,
  },
  // Intelligence
  { id: "spy", type: "INTEL_GATHER", verb: "Spy on", targeted: true },
  { id: "counter-intel", type: "INTEL_COUNTER_INTEL", verb: "Hunt foreign spies", targeted: false },
  { id: "sabotage", type: "INTEL_SABOTAGE", verb: "Sabotage", targeted: true },
  { id: "destabilize", type: "INTEL_DESTABILIZE", verb: "Destabilize", targeted: true },
  { id: "arm-rebels", type: "INTEL_SUPPORT_REBELS", verb: "Arm rebels in", targeted: true },
  {
    id: "disinformation",
    type: "INTEL_MISINFORMATION",
    verb: "Feed disinformation to",
    targeted: true,
  },
  { id: "assassinate", type: "INTEL_ASSASSINATE", verb: "Assassinate leader of", targeted: true },
  { id: "coup", type: "INTEL_COUP", verb: "Back a coup in", targeted: true },
  // Domestic
  { id: "address", type: "DOMESTIC_PROPAGANDA", verb: "National address", targeted: false },
  { id: "reform", type: "DOMESTIC_REFORM", verb: "Reform program", targeted: false },
  {
    id: "policing-soft",
    type: "DOMESTIC_POLICING",
    params: { tactic: "SOFT" },
    verb: "Soft policing",
    targeted: false,
  },
  {
    id: "policing-hard",
    type: "DOMESTIC_POLICING",
    params: { tactic: "HARD" },
    verb: "Hard crackdown",
    targeted: false,
  },
];

/** Orders that can't be undone: the UI confirms them on a separate face. */
export const IRREVERSIBLE_TYPES: ReadonlySet<string> = new Set(
  ENGINE_ORDERS.filter((o) => o.irreversible).map((o) => o.type),
);

/** The registry entry for an action (matching the params that tell variants apart). */
export function engineOrderFor(action: {
  type: string;
  params?: Record<string, unknown>;
}): EngineOrderDef | undefined {
  const variants = ENGINE_ORDERS.filter((o) => o.type === action.type);
  if (variants.length <= 1) return variants[0];
  return (
    variants.find((o) =>
      Object.entries(o.params ?? {}).every(([k, v]) => action.params?.[k] === v),
    ) ??
    // Airstrikes default to military targets, policing to soft (as the engine does)
    variants[0]
  );
}
