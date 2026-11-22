/**
 * Era overlays for the title globe (design-worldmap.md 3.3, decision D-54). Pure: colours, pins,
 * lines, clusters and rim positions from the era map payload (GET /api/scenarios/:id/map). The
 * globe component turns these into feature states, DOM pins and one line source.
 */
import type { BlocSide, EraMap, EraMapCountry, EraSituation, LngLat } from '../../store/gameStore';

export type ColourBy = 'blocs' | 'stability' | 'difficulty';
/** B "Atlas" is the calm default; "all" is A "Situation Room" behind one switch. */
export type Density = 'calm' | 'all';

/** The calm view pins the era's heaviest five situations. */
export const CALM_PINS = 5;

/** Bloc fills by side (62 percent opacity on the globe). */
export const BLOC_SIDE_COLOR: Record<BlocSide, string> = {
  WEST: '#3d8bfd',
  WEST2: '#86b6ff',
  EAST: '#e0475a',
  EAST2: '#f08a6a',
  NONALIGNED: '#2bb3a3',
  OTHER: '#b48cff',
};
const BLOC_ALPHA = 0.62;

/**
 * Stability in five plain words. Instability glows and stability recedes, so the scale also reads
 * by lightness in colour-blind modes. `max` is inclusive.
 */
export const STABILITY_STEPS: ReadonlyArray<{ max: number; word: string; color: string; hint: string }> = [
  { max: 35, word: 'Shaky', color: '#ef5a3c', hint: 'could fall soon' },
  { max: 50, word: 'Strained', color: '#e39a42', hint: 'under real pressure' },
  { max: 62, word: 'Holding', color: '#b8a27a', hint: 'coping, for now' },
  { max: 75, word: 'Steady', color: '#74829a', hint: 'firmly in charge' },
  { max: 101, word: 'Solid', color: '#55647c', hint: 'nothing shakes it' },
];
const STABILITY_ALPHA = 0.78;

export function stabilityStep(n: number) {
  return STABILITY_STEPS.find((s) => n <= s.max) ?? STABILITY_STEPS[STABILITY_STEPS.length - 1];
}
export const stabilityWord = (n: number) => stabilityStep(n).word;

/** Hex to rgba with alpha. */
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = Number.parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Historical eras open on Blocs (the Cold War is the story); November 2026 opens on Stability. */
export function defaultColourBy(era: Pick<EraMap, 'year'> | null | undefined): ColourBy {
  return era && era.year >= 2026 ? 'stability' : 'blocs';
}

export interface EraFills {
  /** Fill colour by ADM0_A3 code (roster, bloc members, merged polygons). */
  fill: Record<string, string>;
  /** Bloc outline colour by code (Stability mode: the camps stay visible as outlines). */
  outline: Record<string, string>;
  /** Polygons painted as part of a parent: hairline border in the parent's colour. */
  merged: Record<string, string>;
}

/** The bloc side of every code in this era (first bloc wins, as in era-map.ts). */
export function blocSideOf(era: EraMap): Map<string, { id: string; name: string; side: BlocSide }> {
  const out = new Map<string, { id: string; name: string; side: BlocSide }>();
  for (const b of era.blocs) for (const m of b.members) if (!out.has(m)) out.set(m, { id: b.id, name: b.name, side: b.side });
  return out;
}

/**
 * Country colours for one era and colouring. Blocs: every bloc member, roster or not
 * (Czechoslovakia is Warsaw Pact red in 1960). Stability: the 41 nations by their era stability,
 * with bloc outlines. Difficulty: the caller's tint. Merged polygons take their parent's colour.
 */
export function eraFills(era: EraMap, colourBy: ColourBy, difficultyTint: Record<string, string> = {}): EraFills {
  const fill: Record<string, string> = {};
  const outline: Record<string, string> = {};
  const merged: Record<string, string> = {};
  const sides = blocSideOf(era);
  const parentOf = new Map(era.merged.map((m) => [m.id, m.partOf]));

  if (colourBy === 'blocs') {
    for (const [id, b] of sides) fill[id] = rgba(BLOC_SIDE_COLOR[b.side], BLOC_ALPHA);
  } else if (colourBy === 'stability') {
    for (const c of era.countries) fill[c.id] = rgba(stabilityStep(c.stability).color, STABILITY_ALPHA);
    for (const [id, b] of sides) outline[id] = BLOC_SIDE_COLOR[b.side];
  } else {
    Object.assign(fill, difficultyTint);
  }
  // A merged polygon is its parent on the map: same fill, same outline, a hairline in that colour
  for (const [id, parent] of parentOf) {
    const p = fill[parent];
    if (p) {
      fill[id] = p;
      merged[id] = p;
    } else delete fill[id];
    if (outline[parent]) outline[id] = outline[parent];
  }
  return { fill, outline, merged };
}

export interface EraPin {
  id: string;
  situation: EraSituation;
  /** 1 to 5 for the era's heaviest situations (the "five fires"), else undefined. */
  num?: number;
}

/** The pins of an era: the heaviest five in the calm view, every situation with the switch on. */
export function eraPins(era: EraMap, density: Density): EraPin[] {
  const sorted = era.situations; // heaviest first (era-map.ts sorts, stable)
  const list = density === 'all' ? sorted : sorted.slice(0, CALM_PINS);
  return list.map((s) => {
    const i = sorted.indexOf(s);
    return { id: s.id, situation: s, num: i < CALM_PINS ? i + 1 : undefined };
  });
}

export type LineStyle = 'front' | 'rival' | 'blockade';
export interface EraLine {
  id: string;
  from: LngLat;
  to: LngLat;
  style: LineStyle;
  /** Belongs to the selected situation (drawn brighter). */
  on: boolean;
}

/** Fronts longer than this (degrees of arc) are not drawn: the two sides are not neighbours. */
export const MAX_FRONT_DEG = 40;

const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Lines of an era. Calm: war fronts only, plus the selected situation's line. All: every
 * situation line and the era's rivals (relations -60 or worse, top 8). One line per pair.
 */
export function eraLines(
  era: EraMap,
  density: Density,
  selected: string | null,
  at: (id: string) => LngLat | null,
): EraLine[] {
  const out = new Map<string, EraLine>();
  const add = (a: string, b: string, style: LineStyle, on: boolean, id: string) => {
    const k = pair(a, b);
    const prev = out.get(k);
    if (prev) {
      if (on) prev.on = true;
      if (style === 'front') prev.style = 'front';
      return;
    }
    const pa = at(a);
    const pb = at(b);
    if (pa && pb) out.set(k, { id, from: pa, to: pb, style, on });
  };
  const sel = era.situations.find((s) => s.id === selected);
  const selPair = sel?.line ? pair(sel.line.from, sel.line.to) : null;
  // A front joins neighbours; a war fought from afar (the US and Iran) is carried by its pin
  const near = (a: string, b: string) => {
    const pa = at(a);
    const pb = at(b);
    return !!pa && !!pb && angularDistance(pa, pb) <= MAX_FRONT_DEG;
  };
  for (const w of era.wars) if (near(w.a, w.b)) add(w.a, w.b, 'front', pair(w.a, w.b) === selPair, `war-${w.a}-${w.b}`);
  for (const s of era.situations) {
    if (!s.line) continue;
    if (s.line.style === 'front' && !near(s.line.from, s.line.to)) continue;
    if (density === 'all' || s.id === selected || s.line.style === 'front') add(s.line.from, s.line.to, s.line.style, s.id === selected, s.id);
  }
  if (density === 'all') for (const r of era.rivals) add(r.a, r.b, 'rival', false, `rival-${r.a}-${r.b}`);
  return [...out.values()];
}

/** Header numbers: "8 situations · 1 war · 5 blocs". */
export function eraCounts(era: EraMap): { situations: number; wars: number; blocs: number } {
  return { situations: era.situations.length, wars: era.wars.length, blocs: era.blocs.length };
}

// ---------------------------------------------------------------------------------------------
// Screen geometry: clusters and rim markers
// ---------------------------------------------------------------------------------------------

export interface ScreenPin {
  id: string;
  x: number;
  y: number;
}

/**
 * Pins closer than `radius` px merge: the first of a group (the heaviest, input order) stays, the
 * others hide behind a count badge. Greedy and order-stable, so the same picture always groups
 * the same way. Returns leader id to member ids (leader first).
 */
export function clusterPins(pins: ScreenPin[], radius = 28): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const leaders: ScreenPin[] = [];
  for (const p of pins) {
    const near = leaders.find((l) => Math.hypot(l.x - p.x, l.y - p.y) < radius);
    if (near) groups.get(near.id)?.push(p.id);
    else {
      leaders.push(p);
      groups.set(p.id, [p.id]);
    }
  }
  return groups;
}

/** Offsets in px that fan `n` cluster members out in a ring around their leader. */
export function fanOffsets(n: number, r = 34): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return [0, 0] as [number, number];
    const a = -Math.PI / 2 + ((i - 1) * 2 * Math.PI) / Math.max(1, n - 1);
    return [Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)] as [number, number];
  });
}

const RAD = Math.PI / 180;

/** Great-circle angle in degrees between two points. */
export function angularDistance(a: LngLat, b: LngLat): number {
  const [l1, p1] = [a[0] * RAD, a[1] * RAD];
  const [l2, p2] = [b[0] * RAD, b[1] * RAD];
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l2 - l1);
  return Math.acos(Math.min(1, Math.max(-1, c))) / RAD;
}

/**
 * The point on the visible rim in the direction of `target`, seen from the globe's centre: the
 * destination `rim` degrees along the great circle from `center` toward `target`. A situation on
 * the far side shows there as a rim marker pointing to it.
 */
export function rimPoint(center: LngLat, target: LngLat, rim = 84): LngLat {
  const [l1, p1] = [center[0] * RAD, center[1] * RAD];
  const [l2, p2] = [target[0] * RAD, target[1] * RAD];
  const y = Math.sin(l2 - l1) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1);
  const brg = Math.atan2(y, x);
  const d = rim * RAD;
  const p3 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(brg));
  const l3 = l1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p3));
  let lng = l3 / RAD;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return [lng, p3 / RAD];
}

/** A point is on the far side once it is more than `limit` degrees from the view centre. */
export const isFarSide = (center: LngLat, p: LngLat, limit = 80) => angularDistance(center, p) > limit;

// ---------------------------------------------------------------------------------------------
// Hover card text
// ---------------------------------------------------------------------------------------------

export interface CountryTip {
  title: string;
  lines: string[];
}

/**
 * The hover (or long-press) card for a country in this era: era name, leader and title (or
 * "Leader invented for this era"), stability word and number, bloc, up to two rivals.
 */
export function countryTip(era: EraMap, id: string, fallbackName?: string): CountryTip | null {
  const parent = era.merged.find((m) => m.id === id)?.partOf;
  const c: EraMapCountry | undefined = era.countries.find((x) => x.id === id);
  const sides = blocSideOf(era);
  const bloc = sides.get(id) ?? (parent ? sides.get(parent) : undefined);
  if (!c) {
    if (!fallbackName && !parent) return null;
    const p = parent ? era.countries.find((x) => x.id === parent) : undefined;
    const lines: string[] = [];
    if (p) lines.push(`Part of ${p.name}`);
    if (bloc) lines.push(`Camp: ${bloc.name}`);
    return { title: fallbackName ?? id, lines };
  }
  const lines: string[] = [];
  if (c.status !== 'STATE') {
    lines.push(c.note || (c.status === 'PART_OF' ? 'Not a state in this era' : 'Not independent in this era'));
    lines.push('Not playable in this era');
  } else {
    lines.push(c.leader ? `${c.leader.name}, ${c.leader.title}` : 'Leader invented for this era');
    lines.push(`Stability ${c.stability} (${stabilityWord(c.stability).toLowerCase()})`);
  }
  lines.push(bloc ? `Camp: ${bloc.name}` : 'Camp: none');
  const rivals = era.rivals
    .filter((r) => r.a === id || r.b === id)
    .slice(0, 2)
    .map((r) => era.countries.find((x) => x.id === (r.a === id ? r.b : r.a))?.name ?? (r.a === id ? r.b : r.a));
  const enemies = era.wars
    .filter((w) => w.a === id || w.b === id)
    .map((w) => era.countries.find((x) => x.id === (w.a === id ? w.b : w.a))?.name ?? '')
    .filter(Boolean);
  if (enemies.length) lines.push(`At war with ${enemies.slice(0, 2).join(', ')}`);
  if (rivals.length) lines.push(`Rivals: ${rivals.join(', ')}`);
  return { title: c.status === 'STATE' ? c.name : (c.label ?? c.name), lines };
}

/** Why a nation cannot be led in this era (B-17), or null when it can. */
export function unplayableIn(era: EraMap | null | undefined, id: string): string | null {
  const c = era?.countries.find((x) => x.id === id);
  if (!c || c.status === 'STATE') return null;
  return c.status === 'PART_OF' ? `${c.label ?? c.name}: part of another state in ${era?.year}` : `${c.label ?? c.name}: not independent in ${era?.year}`;
}

/** Era names for the label layer: era names of states, era labels of the rest. */
export function eraNames(era: EraMap): Record<string, string> {
  return Object.fromEntries(era.countries.map((c) => [c.id, c.name]));
}

/** Era status for the label layer (italic era labels). */
export function eraStatusLabels(era: EraMap): Record<string, { status: 'PART_OF' | 'NOT_INDEPENDENT'; label: string }> {
  const out: Record<string, { status: 'PART_OF' | 'NOT_INDEPENDENT'; label: string }> = {};
  for (const c of era.countries) if (c.status !== 'STATE') out[c.id] = { status: c.status, label: c.label ?? c.name };
  return out;
}
