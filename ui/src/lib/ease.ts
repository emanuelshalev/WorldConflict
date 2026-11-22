/**
 * Ease of play (iteration 2, F-01-1, F-01-4, F-01-6): pure helpers behind the country picker, the
 * month 1 desk, the short briefing, the result card art and the "Big move" suggestion. No store
 * imports at runtime, so `tests/ui-ease.spec.ts` can check them from the backend test runner.
 */
import type { ConditionStatus, ObjectiveState } from '../store/gameStore';
import type { SceneKind } from '../scenes/kinds';

// ---------------------------------------------------------------------------
// Relations in words (the picker, map menu and dossier say "Hostile", never "(-62)")
// ---------------------------------------------------------------------------

export type RelationTone = 'war' | 'ally' | 'warm' | 'neutral' | 'cool' | 'hostile';

export function relationWord(rel: number, opts: { atWar?: boolean; ally?: boolean } = {}): { word: string; tone: RelationTone } {
  if (opts.atWar) return { word: 'At war with you', tone: 'war' };
  if (opts.ally) return { word: 'Your ally', tone: 'ally' };
  if (rel >= 40) return { word: 'Friendly', tone: 'warm' };
  if (rel >= 15) return { word: 'Warm', tone: 'warm' };
  if (rel > -15) return { word: 'Neutral', tone: 'neutral' };
  if (rel > -40) return { word: 'Cool', tone: 'cool' };
  return { word: 'Hostile', tone: 'hostile' };
}

// ---------------------------------------------------------------------------
// Country picker: who comes first, and search that accepts typing
// ---------------------------------------------------------------------------

export interface PickCountry {
  id: string;
  name: string;
  relation: number;
  atWar?: boolean;
  ally?: boolean;
  /** Capital [lon, lat], for neighbours. */
  capital?: [number, number];
}

export interface PickContext {
  /** Countries in this month's crisis (first). */
  crisis?: string[];
  /** Targets the player used lately (most recent first). */
  recent?: string[];
  /** Your historical rivals and allies (from your own profile). */
  rivals?: string[];
  allies?: string[];
  /** Your capital, for neighbours. */
  home?: [number, number];
}

export interface PickRow extends PickCountry {
  /** Why it is near the top: "In the crisis", "Recent", "Rival", "Ally", "Neighbour". */
  why?: string;
}

/** Great-circle distance in km between two [lon, lat] points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Capitals closer than this count as neighbours. */
export const NEIGHBOUR_KM = 1600;
/** At most this many rows in the "Suggested" group. */
export const MAX_SUGGESTED = 8;

/**
 * The picker's two groups: "Likely targets" (the crisis countries, recent targets, wars, allies,
 * rivals and neighbours, each with its reason, at most 8) and everyone else alphabetically.
 */
export function pickerGroups(list: PickCountry[], ctx: PickContext = {}): { suggested: PickRow[]; rest: PickRow[] } {
  const why = new Map<string, string>();
  const add = (id: string, reason: string) => {
    if (!why.has(id) && list.some((c) => c.id === id)) why.set(id, reason);
  };
  for (const id of ctx.crisis ?? []) add(id, 'In the crisis');
  for (const id of ctx.recent ?? []) add(id, 'Recent');
  for (const c of list) if (c.atWar) add(c.id, 'At war with you');
  for (const c of list) if (c.ally) add(c.id, 'Your ally');
  for (const id of ctx.rivals ?? []) add(id, 'Rival');
  for (const id of ctx.allies ?? []) add(id, 'Old friend');
  if (ctx.home) {
    const home = ctx.home;
    const near = list.filter((c) => c.capital && distanceKm(home, c.capital) < NEIGHBOUR_KM).sort((a, b) => distanceKm(home, a.capital as [number, number]) - distanceKm(home, b.capital as [number, number]));
    for (const c of near) add(c.id, 'Neighbour');
  }
  const ids = [...why.keys()].slice(0, MAX_SUGGESTED);
  const byId = new Map(list.map((c) => [c.id, c]));
  const suggested = ids.map((id) => ({ ...(byId.get(id) as PickCountry), why: why.get(id) }));
  const rest = list.filter((c) => !ids.includes(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  return { suggested, rest };
}

/** Names people type that are not the profile name. */
const ALIASES: Record<string, string[]> = {
  USA: ['us', 'usa', 'america', 'united states'],
  GBR: ['uk', 'britain', 'england'],
  RUS: ['russia'],
  PRK: ['north korea', 'dprk'],
  KOR: ['south korea'],
  CHN: ['prc'],
  TWN: ['roc'],
  ARE: ['uae', 'emirates'],
  SAU: ['ksa', 'saudi'],
  PSX: ['west bank', 'palestine'],
  IRN: ['persia'],
};

/** Typing filter: every typed word starts a word of the name, the code or an alias. */
export function searchCountries<T extends { id: string; name: string }>(list: T[], query: string): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  const hit = (c: T) => {
    const hay = [c.name, c.id, ...(ALIASES[c.id] ?? [])].join(' ').toLowerCase().split(/[\s,.'()-]+/);
    return words.every((w) => hay.some((h) => h.startsWith(w)));
  };
  // Names that start with the query come first ("ir" lists Iran before Ireland's neighbours)
  const q = words.join(' ');
  return list.filter(hit).sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)));
}

const RECENT_KEY = 'worldconflict.recentTargets';

/** Recent targets (per viewer, a convenience: empty when storage is unavailable). */
export function readRecentTargets(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function pushRecentTarget(id: string): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecentTargets().filter((x) => x !== id)].slice(0, 5)));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------------------
// Month 1: less at once
// ---------------------------------------------------------------------------

/**
 * Month 1 in Focus view shows only the crisis, its cards and Execute; advisors, budgets and
 * meetings appear from month 2, or at once when the player asks ("Show the whole desk").
 */
export function simpleMonth(turn: number | undefined, deskView: 'focus' | 'full', shown: boolean): boolean {
  // world.turn counts months played: 0 is month 1
  return (turn ?? 0) < 1 && deskView === 'focus' && !shown;
}

// ---------------------------------------------------------------------------
// Briefing: the mission in one line and at most three goals in plain words
// ---------------------------------------------------------------------------

/** Plain words for a goal's state on the briefing (numbers live behind "All goals"). */
export const PLAIN_STATE: Record<ObjectiveState, string> = { on_track: 'On track', close: 'Nearly there', off_track: 'Needs work', failed: 'Lost' };

const URGENCY: Record<ObjectiveState, number> = { failed: 0, off_track: 1, close: 2, on_track: 3 };

/**
 * The goals the briefing shows: primary goals only, the ones that need work first (stable order
 * otherwise), at most `max`. Returns them with the count left for "All goals".
 */
export function briefingGoals(status: ConditionStatus[], max = 3, stateOf: (c: ConditionStatus) => ObjectiveState = (c) => c.state ?? (c.failed ? 'failed' : c.met ? 'on_track' : 'off_track')): { shown: ConditionStatus[]; hidden: number } {
  const primary = status.map((c, i) => ({ c, i })).filter((x) => !x.c.bonus);
  const ordered = [...primary].sort((a, b) => URGENCY[stateOf(a.c)] - URGENCY[stateOf(b.c)] || a.i - b.i);
  const shown = ordered.slice(0, max).map((x) => x.c);
  return { shown, hidden: status.length - shown.length };
}

// ---------------------------------------------------------------------------
// Effect sizes in words ("Approval about +3")
// ---------------------------------------------------------------------------

/** One forecast effect as a phrase: numbers get "about", ranges and words stay as they are. */
export function effectPhrase(e: { target?: string; metric: string; delta: string }, opts: { withTarget?: boolean } = {}): string {
  const d = e.delta.trim();
  const single = /^[+-−±]?\d+(\.\d+)?%?$/.test(d);
  const who = opts.withTarget !== false && e.target && !['Global', 'You', 'Your public'].includes(e.target) ? `${e.target}: ` : '';
  return `${who}${e.metric} ${single ? `about ${d}` : d}`;
}

export interface SizeLine {
  text: string;
  tone: 'up' | 'down';
}

/**
 * A crisis option's effects with their sizes ("Approval about -3", "Iran's view of you about
 * +8"), from the engine's per-option numbers. The resting card keeps its two words ("Approval
 * down"); these show on expand. Biggest first.
 */
export function optionSizes(o: { effects: Record<string, number>; tensionDelta?: number }, names: (id: string) => string): SizeLine[] {
  const out: Array<SizeLine & { mag: number }> = [];
  const push = (label: string, v: number | undefined, goodWhenUp = true, scale = 1) => {
    if (!v || Math.abs(v) < 0.05) return;
    out.push({ text: `${label} about ${sizeWord(v)}`, tone: v > 0 === goodWhenUp ? 'up' : 'down', mag: Math.abs(v) / scale });
  };
  const e = o.effects;
  push('Approval', e.approval);
  push('Stability', e.stability);
  push('Legitimacy', e.legitimacy);
  if (e.gdp) push('Economy (GDP %)', e.gdp, true, 0.2);
  if (e.growth) push('Growth (points)', e.growth, true, 0.1);
  push("Allies' view of you", e.relationsAllies);
  push("Rivals' view of you", e.relationsRivals);
  for (const [k, v] of Object.entries(e)) if (k.startsWith('relations:')) push(`${names(k.split(':')[1])}'s view of you`.replace(/s's view/, "s' view"), v);
  push('Political capital', e.pc, true, 0.3);
  push('World tension', o.tensionDelta, false);
  return out.sort((a, b) => b.mag - a.mag).map(({ text, tone }) => ({ text, tone }));
}

/** The size of an option's effect, from the engine's per-option numbers. */
export function sizeWord(n: number): string {
  const a = Math.abs(n);
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${a >= 10 ? Math.round(a) : Math.round(a * 10) / 10}`;
}

// ---------------------------------------------------------------------------
// Big move: spend 3 or more unspent seals on the mission in one press
// ---------------------------------------------------------------------------

export interface MoveCandidate {
  key: string;
  label: string;
  cost: number;
  /** Mission objectives this order helps (missionImpact), empty when it helps none. */
  helps: number;
  /** Already in this month. */
  queued?: boolean;
  /** It hurts or breaks an objective. */
  risky?: boolean;
}

/** The smallest unspent capital that earns a Big move. */
export const BIG_MOVE_MIN = 3;

/**
 * The Big move: from the advisors' suggestions, the orders that help the mission (most helpful,
 * then the dearest first) that together spend as much of the unspent capital as possible. Null
 * when fewer than 3 seals are unspent, or nothing helpful costs capital. At most 3 orders, and
 * never more orders than the month has room for.
 */
export function bigMove(cands: MoveCandidate[], left: number, room = 6): { picks: MoveCandidate[]; seals: number } | null {
  if (left < BIG_MOVE_MIN || room <= 0) return null;
  const pool = cands.filter((c) => !c.queued && !c.risky && c.cost > 0 && c.helps > 0).sort((a, b) => b.helps - a.helps || b.cost - a.cost);
  const picks: MoveCandidate[] = [];
  let seals = 0;
  for (const c of pool) {
    if (picks.length >= Math.min(3, room)) break;
    if (seals + c.cost > left) continue;
    picks.push(c);
    seals += c.cost;
  }
  if (!picks.length || seals < 2) return null;
  return { picks, seals };
}

// ---------------------------------------------------------------------------
// Result card art: the picture follows what happened, and never repeats last month's room
// ---------------------------------------------------------------------------

/** The interior "rooms" that read the same month after month. */
export const ROOM_SCENES: ReadonlySet<SceneKind> = new Set<SceneKind>(['cabinet', 'press', 'parliament', 'tv_interview', 'exec_order']);

export interface OutcomeSignals {
  verdict?: 'good' | 'bad' | 'mixed' | 'neutral';
  /** Your war fronts' biggest move this month (positive: you gained). */
  front?: number;
  /** The lead country's view of you, change this month. */
  relation?: number;
  tension?: number;
  approval?: number;
  /** The lead item failed. */
  failed?: boolean;
  /** The lead item's family: diplomacy and domestic never get military art. */
  family?: 'diplomacy' | 'domestic' | 'military' | 'intel';
}

/**
 * Turns a room scene into the scene of what happened: a front that moved shows the troops, a
 * warmer partner the summit, a public that turned the streets or the address. Failures never get a
 * celebratory picture. Then, if that is the scene last month's card used, its alternate.
 */
export function resultScene(base: SceneKind | undefined, s: OutcomeSignals, previous?: SceneKind, alternate?: (k: SceneKind) => SceneKind): SceneKind {
  let k: SceneKind = base ?? 'press';
  const bad = s.failed || s.verdict === 'bad';
  if (ROOM_SCENES.has(k)) {
    const military = s.family === 'military' || s.family === undefined || s.family === 'intel';
    const talks = s.family === 'diplomacy' || s.family === undefined;
    if (!bad && (s.relation ?? 0) >= 5 && talks) k = 'summit';
    else if (military && Math.abs(s.front ?? 0) >= 3) k = (s.front ?? 0) > 0 ? 'deployment' : 'war_room';
    else if ((s.approval ?? 0) <= -3) k = 'streets';
    else if (!bad && (s.approval ?? 0) >= 3) k = 'address';
    else if (!bad && (s.tension ?? 0) <= -5 && talks) k = 'summit';
  }
  if (bad && (k === 'summit' || k === 'signing' || k === 'ceasefire')) k = 'press';
  if (previous && k === previous && alternate) k = alternate(k);
  return k;
}
