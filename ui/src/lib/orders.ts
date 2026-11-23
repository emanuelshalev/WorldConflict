import type { CountryFull, PlayerViewCountry } from '../store/gameStore';
import { ORDER_FAMILY_WORDS } from './glossary';

/**
 * The single list of player orders: desk catalog, desk search, map menu, dossier and staff
 * picks all read it (design-orders.md §4.1). The engine owns the same list as data in
 * `src/core/orders.ts` (id, type, params, verb, targeted, irreversible); this file adds the
 * presentation (family, category, danger, relevance, blurb). `tests/ui-orders-parity.spec.ts`
 * keeps both in step, and checks that the map and the desk offer the same orders per target.
 */
/**
 * The six visual families (design-order-cards.md section 4): the D-66 five plus Nuclear as the
 * hazard variant of Military. Each family is always shown four ways at once (pictogram, family
 * word, plate colour, edge), never by colour alone.
 */
export type OrderFamily = 'diplo' | 'mil' | 'intel' | 'nuke' | 'econ' | 'home';

/** The family word on every card's chip (glossary: one word per family). */
export const FAMILY_WORD: Record<OrderFamily, string> = ORDER_FAMILY_WORDS;

export const FAMILIES: readonly OrderFamily[] = ['diplo', 'mil', 'nuke', 'intel', 'econ', 'home'];
export type OrderCategory = 'Diplomacy' | 'Military' | 'Intelligence' | 'Domestic';

export interface OrderDef {
  /** Stable id ("airstrike-nuclear"), shared with the engine; used for tests and keys. */
  id: string;
  /** ActionType */
  type: string;
  params?: Record<string, unknown>;
  /** "Strike nuclear sites in": the full label is `${verb} ${target}`. Untargeted: the label. */
  verb: string;
  /** Label when the order has no target ("Fund nuclear program"). */
  untargetedLabel?: string;
  family: OrderFamily;
  category: OrderCategory;
  targeted: boolean;
  danger?: boolean;
  /** DIPLOMACY_DECLARE_WAR, NUCLEAR_STRIKE: confirmed on a separate face, never on Enter. */
  irreversible?: boolean;
  /** Map ordering against one country: higher first, 0 = left out of the short list. */
  relevance?: (me: CountryFull, view: PlayerViewCountry) => number;
  /** One line on an available card. `{T}` is the target's name. */
  blurb: string;
}

/** What the map and the dossier know about a country, for relevance. */
interface Situation {
  atWar: boolean;
  allied: boolean;
  deployed: boolean;
  theirProgram: boolean;
  myBomb: boolean;
  otherWar: boolean;
}

function situation(me: CountryFull, view: PlayerViewCountry): Situation {
  return {
    atWar: me.atWarWith.includes(view.id),
    allied: me.alliances.includes(view.id),
    deployed: me.borderDeployments.some((d) => d.targetCountryId === view.id),
    theirProgram: view.nuclearStatus === 'DEVELOPING',
    myBomb: me.nuclear.status === 'ARMED' || me.nuclear.status === 'TESTED',
    otherWar: view.atWarWith.some((x) => x !== me.id),
  };
}

/** Relevance from a rule on the situation: `[atWar, atPeace]` weights, 0 hides it. */
const rel =
  (fn: (s: Situation) => [number, number]) =>
  (me: CountryFull, view: PlayerViewCountry): number => {
    const s = situation(me, view);
    const [war, peace] = fn(s);
    return s.atWar ? war : peace;
  };

export const ORDERS: readonly OrderDef[] = [
  // Diplomacy
  {
    id: 'court', type: 'DIPLOMACY_IMPROVE_RELATIONS', verb: 'Court', family: 'diplo', category: 'Diplomacy', targeted: true,
    relevance: rel(() => [0, 100]),
    blurb: 'Trade talks and quiet diplomacy warm relations with {T}.',
  },
  {
    id: 'denounce', type: 'DIPLOMACY_DENOUNCE', verb: 'Denounce', family: 'diplo', category: 'Diplomacy', targeted: true,
    relevance: rel(() => [0, 95]),
    blurb: 'Condemn {T} in public. Voters may cheer; {T} will remember.',
  },
  {
    id: 'offer-pact', type: 'DIPLOMACY_PROPOSE_ALLIANCE', verb: 'Offer defense pact to', family: 'diplo', category: 'Diplomacy', targeted: true,
    relevance: rel((s) => [0, s.allied ? 0 : 85]),
    blurb: 'A mutual defense treaty: an attack on one is an attack on both.',
  },
  {
    id: 'ceasefire', type: 'DIPLOMACY_PROPOSE_CEASEFIRE', verb: 'Propose ceasefire to', family: 'diplo', category: 'Diplomacy', targeted: true,
    relevance: rel(() => [100, 0]),
    blurb: 'Seek an end to the war with {T}. Exhaustion and the front decide.',
  },
  {
    id: 'mediate', type: 'DIPLOMACY_MEDIATE', verb: 'Mediate peace for', family: 'diplo', category: 'Diplomacy', targeted: true,
    relevance: rel((s) => [0, s.otherWar ? 80 : 0]),
    blurb: 'Host talks to end the war {T} is fighting.',
  },
  {
    id: 'break-pact', type: 'DIPLOMACY_BREAK_ALLIANCE', verb: 'Break pact with', family: 'diplo', category: 'Diplomacy', targeted: true, danger: true,
    relevance: rel((s) => [0, s.allied ? 85 : 0]),
    blurb: 'Tear up the treaty with {T}. Betrayal is remembered.',
  },
  {
    id: 'declare-war', type: 'DIPLOMACY_DECLARE_WAR', verb: 'Declare war on', family: 'mil', category: 'Diplomacy', targeted: true, danger: true, irreversible: true,
    relevance: rel((s) => [0, s.allied ? 0 : 60]),
    blurb: 'Order the invasion of {T}. Their allies may join them.',
  },
  // Military
  {
    id: 'mobilize', type: 'MILITARY_MOBILIZE', verb: 'Mobilize forces', family: 'mil', category: 'Military', targeted: false,
    blurb: 'Call up the reserves. Rivals read it as a threat.',
  },
  {
    id: 'demobilize', type: 'MILITARY_DEMOBILIZE', verb: 'Stand down forces', family: 'mil', category: 'Military', targeted: false,
    blurb: 'Send the reserves home. A little calmer at home.',
  },
  {
    id: 'procure', type: 'MILITARY_PROCURE', verb: 'Buy weapons', family: 'mil', category: 'Military', targeted: false,
    blurb: 'Buy equipment from your arms suppliers.',
  },
  {
    id: 'deploy-border', type: 'MILITARY_DEPLOY_BORDER', verb: 'Mass troops facing', family: 'mil', category: 'Military', targeted: true, danger: true,
    relevance: rel((s) => (s.deployed ? [0, 0] : [90, 75])),
    blurb: 'Station troops on the border with {T}: steady pressure every month.',
  },
  {
    id: 'withdraw-border', type: 'MILITARY_WITHDRAW_BORDER', verb: 'Withdraw troops facing', family: 'mil', category: 'Military', targeted: true,
    relevance: rel((s) => (s.deployed ? [90, 75] : [0, 0])),
    blurb: 'Pull the troops back from {T}. De-escalation is noticed.',
  },
  {
    id: 'airstrike-military', type: 'MILITARY_AIRSTRIKE', params: { targetType: 'MILITARY' }, verb: 'Strike military targets in', family: 'mil', category: 'Military', targeted: true, danger: true,
    relevance: rel(() => [95, 65]),
    blurb: 'Precision strikes on the armed forces of {T}.',
  },
  {
    id: 'airstrike-nuclear', type: 'MILITARY_AIRSTRIKE', params: { targetType: 'NUCLEAR' }, verb: 'Strike nuclear sites in', family: 'mil', category: 'Military', targeted: true, danger: true,
    relevance: rel((s) => [s.theirProgram ? 85 : 0, 0]),
    blurb: 'Hit the nuclear program of {T}. Two hits in a row cripple it.',
  },
  {
    id: 'fund-nuclear', type: 'NUCLEAR_FUND_PROGRAM', verb: 'Fund nuclear program', untargetedLabel: 'Fund nuclear program', family: 'nuke', category: 'Military', targeted: false, danger: true,
    blurb: 'Push the nuclear program forward. Foreign spies watch for it.',
  },
  {
    id: 'nuclear-strike', type: 'NUCLEAR_STRIKE', verb: 'Nuclear strike on', family: 'nuke', category: 'Military', targeted: true, danger: true, irreversible: true,
    relevance: rel((s) => [s.myBomb ? 70 : 0, 0]),
    blurb: 'Nuclear release against {T}. The world will answer.',
  },
  // Intelligence
  {
    id: 'spy', type: 'INTEL_GATHER', verb: 'Spy on', family: 'intel', category: 'Intelligence', targeted: true,
    relevance: rel(() => [80, 90]),
    blurb: 'Sharpens your estimate of the forces and economy of {T}.',
  },
  {
    id: 'counter-intel', type: 'INTEL_COUNTER_INTEL', verb: 'Hunt foreign spies', family: 'intel', category: 'Intelligence', targeted: false,
    blurb: 'Most foreign operations against you fail for 3 months.',
  },
  {
    id: 'sabotage', type: 'INTEL_SABOTAGE', verb: 'Sabotage', family: 'intel', category: 'Intelligence', targeted: true,
    relevance: rel((s) => (s.theirProgram ? [75, 70] : [0, 0])),
    blurb: 'Covert damage to the infrastructure of {T}.',
  },
  {
    id: 'destabilize', type: 'INTEL_DESTABILIZE', verb: 'Destabilize', family: 'intel', category: 'Intelligence', targeted: true,
    relevance: rel((s) => (s.theirProgram ? [0, 0] : [75, 70])),
    blurb: 'Fund opposition media, strikes and scandal in {T}.',
  },
  {
    id: 'arm-rebels', type: 'INTEL_SUPPORT_REBELS', verb: 'Arm rebels in', family: 'intel', category: 'Intelligence', targeted: true, danger: true,
    blurb: 'Arm and finance insurgents inside {T}.',
  },
  {
    id: 'disinformation', type: 'INTEL_MISINFORMATION', verb: 'Feed disinformation to', family: 'intel', category: 'Intelligence', targeted: true,
    blurb: 'Give the spies of {T} a false picture of your strength.',
  },
  {
    id: 'assassinate', type: 'INTEL_ASSASSINATE', verb: 'Assassinate leader of', family: 'intel', category: 'Intelligence', targeted: true, danger: true,
    blurb: 'Eliminate the leader of {T}. The successor may be worse.',
  },
  {
    id: 'coup', type: 'INTEL_COUP', verb: 'Back a coup in', family: 'intel', category: 'Intelligence', targeted: true, danger: true,
    blurb: 'Back a faction to install a friendly government in {T}.',
  },
  // Domestic
  {
    id: 'address', type: 'DOMESTIC_PROPAGANDA', verb: 'National address', family: 'home', category: 'Domestic', targeted: false,
    blurb: 'Rally the nation. Repetition dulls the message.',
  },
  {
    id: 'reform', type: 'DOMESTIC_REFORM', verb: 'Reform program', family: 'econ', category: 'Domestic', targeted: false,
    blurb: 'Stability now, growth later. Wins no votes.',
  },
  {
    id: 'policing-soft', type: 'DOMESTIC_POLICING', params: { tactic: 'SOFT' }, verb: 'Soft policing', family: 'home', category: 'Domestic', targeted: false,
    blurb: 'Patient policing and talks: slow, with no backlash.',
  },
  {
    id: 'policing-hard', type: 'DOMESTIC_POLICING', params: { tactic: 'HARD' }, verb: 'Hard crackdown', family: 'home', category: 'Domestic', targeted: false, danger: true,
    blurb: 'Overwhelming force against the insurgency. Democracies object.',
  },
];

export const CATEGORIES: readonly OrderCategory[] = ['Diplomacy', 'Military', 'Intelligence', 'Domestic'];

/** The registry grouped for the desk catalog, in category order. */
export const ORDERS_BY_CATEGORY: Record<OrderCategory, OrderDef[]> = {
  Diplomacy: ORDERS.filter((o) => o.category === 'Diplomacy'),
  Military: ORDERS.filter((o) => o.category === 'Military'),
  Intelligence: ORDERS.filter((o) => o.category === 'Intelligence'),
  Domestic: ORDERS.filter((o) => o.category === 'Domestic'),
};

export const orderById = (id: string): OrderDef | undefined => ORDERS.find((o) => o.id === id);

/** The registry entry for an action, matching the params that tell variants apart. */
export function orderFor(action: { type: string; params?: Record<string, unknown> }): OrderDef | undefined {
  const variants = ORDERS.filter((o) => o.type === action.type);
  if (variants.length <= 1) return variants[0];
  return variants.find((o) => Object.entries(o.params ?? {}).every(([k, v]) => action.params?.[k] === v)) ?? variants[0];
}

/** One label everywhere: "Strike nuclear sites in Iran", "Fund nuclear program". */
export function orderLabel(def: OrderDef, targetName?: string): string {
  if (!def.targeted) return def.untargetedLabel ?? def.verb;
  return targetName ? `${def.verb} ${targetName}` : def.verb;
}

/** The blurb with the target filled in ("the target" when none is picked yet). */
export function orderBlurb(def: OrderDef, targetName?: string): string {
  return def.blurb.split('{T}').join(targetName ?? 'the target');
}

/** The action to queue for an order: type, params, target and label. */
export function orderAction(def: OrderDef, targetId?: string, targetName?: string) {
  return {
    type: def.type,
    label: orderLabel(def, targetName),
    ...(def.params ? { params: def.params } : {}),
    ...(def.targeted && targetId ? { targetCountryId: targetId } : {}),
  };
}

/** Every order that acts on a country: the desk catalog's list once a target is picked. */
export function targetedOrders(): OrderDef[] {
  return ORDERS.filter((o) => o.targeted);
}

/** The desk catalog's orders for a target (all targeted orders, in catalog order). */
export function deskOrders(): OrderDef[] {
  return targetedOrders();
}

/** How many orders the map and dossier show before "All {n} orders for {T}". */
export const SHORT_LIST = 6;

/**
 * The orders for one country, most relevant first. The short list (map menu, dossier) is the
 * top SHORT_LIST with a relevance above 0; `expanded` is every targeted order, the same set the
 * desk offers for that target (the parity rule).
 */
export function ordersFor(me: CountryFull, view: PlayerViewCountry, opts: { expanded?: boolean } = {}): OrderDef[] {
  const scored = targetedOrders().map((o, i) => ({ o, i, r: o.relevance?.(me, view) ?? 0 }));
  scored.sort((a, b) => b.r - a.r || a.i - b.i);
  if (opts.expanded) return scored.map((s) => s.o);
  return scored
    .filter((s) => s.r > 0)
    .slice(0, SHORT_LIST)
    .map((s) => s.o);
}
