import maplibregl from 'maplibre-gl';
import {
  IconBomb,
  IconCheckbox,
  IconCrown,
  IconCrownOff,
  IconFlame,
  IconLock,
  IconRadioactive,
  IconRocket,
  IconSpeakerphone,
  IconSwords,
  IconTank,
  IconTrendingDown,
  IconWalk,
  type Icon,
} from '@tabler/icons-react';
import type { NewspaperEntry, PlayerViewCountry, WorldState } from '../store/gameStore';
import { createElement } from 'react';
import { heat, hotspotLine, zoneIcon } from '../lib/hotspots';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Animated map markers derived from the game state: HTML maplibregl.Markers animated with CSS
 * keyframes (see the "Map state markers" section of wc.css). Each marker is keyed, so a month
 * change only adds, removes or updates what changed. Reduced motion is handled in CSS.
 */

// --------------------------------------------------------------------------
// Signals: what happened, read from the payload
// --------------------------------------------------------------------------

export type GovKind = 'coup' | 'revolution' | 'assassination' | 'election' | 'leader';

export interface MapSignals {
  /** Countries that used a nuclear weapon (from the timeline and this month's news). */
  nukeUsers: Set<string>;
  /**
   * id -> fallout severity; `direct` for the country the weapon hit (vs radiation drifting into
   * a neighbour), `fresh` when the strike landed in the month just played.
   */
  struck: Map<string, { fallout: number; fresh: boolean; direct: boolean }>;
  /** Countries hit by airstrikes in the month just played (id -> who struck). */
  airstruck: Map<string, string>;
  /** Government changes in the month just played. */
  govChange: Map<string, GovKind>;
  /** The newspaper of the month just played. */
  latestNews: NewspaperEntry[];
}

/** The newspaper keeps only the month just played (stamped before the turn counter moves on). */
export function latestNews(world: WorldState): NewspaperEntry[] {
  const max = world.newspaper.reduce((m, n) => Math.max(m, n.turn), -Infinity);
  if (max < world.turn - 1) return [];
  return world.newspaper.filter((n) => n.turn === max);
}

/** True when an engine turn stamp belongs to the month just played. */
const isFresh = (world: WorldState, turn: number | undefined) =>
  turn !== undefined && turn >= world.turn - 1 && world.turn > 0;

export function deriveSignals(world: WorldState, view: PlayerViewCountry[]): MapSignals {
  const news = latestNews(world);
  // Nuclear use is not a standing flag (the global embargo also covers sanctioned states), so
  // read it from the record: "☢ <Country> USES NUCLEAR WEAPON" in the timeline and the news
  const nukeUsers = new Set<string>();
  const byName = new Map(world.countries.map((c) => [c.name.toUpperCase(), c.id]));
  for (const t of world.timeline ?? []) {
    const m = t.category === 'NUCLEAR' ? /^\W*(.+?) USES NUCLEAR WEAPON/i.exec(t.description) : null;
    const id = m && byName.get(m[1].trim().toUpperCase());
    if (id) nukeUsers.add(id);
  }
  for (const n of news) {
    if (n.category === 'NUCLEAR' && /USES NUCLEAR/i.test(n.headline) && n.relatedCountries[0])
      nukeUsers.add(n.relatedCountries[0]);
  }
  const byId = new Map(world.countries.map((c) => [c.id, c]));
  const struck = new Map<string, { fallout: number; fresh: boolean; direct: boolean }>();
  for (const v of view) {
    const fallout = v.fallout ?? v.full?.fallout ?? byId.get(v.id)?.fallout ?? 0;
    const nukedTurn = byId.get(v.id)?.nukedTurn;
    if (fallout > 0)
      struck.set(v.id, { fallout, fresh: isFresh(world, nukedTurn), direct: nukedTurn !== undefined });
  }
  const airstruck = new Map<string, string>();
  for (const n of news) {
    if (n.category === 'WAR' && /airstrike|CRIPPLES/i.test(n.headline) && n.relatedCountries[1])
      airstruck.set(n.relatedCountries[1], n.relatedCountries[0]);
  }
  for (const o of world.turnReport?.orders ?? []) {
    if (o.ok && o.type === 'MILITARY_AIRSTRIKE' && o.target) airstruck.set(o.target, world.playerCountryId);
  }
  const govChange = new Map<string, GovKind>();
  for (const n of news) {
    const id = n.relatedCountries[0];
    if (n.category !== 'GOVERNMENT' || !id) continue;
    const h = n.headline;
    govChange.set(
      id,
      /COUP/i.test(h)
        ? 'coup'
        : /REVOLUTION/i.test(h)
          ? 'revolution'
          : /ASSASSINATED/i.test(h)
            ? 'assassination'
            : /VOT|ELECT|OUST|IMPEACH/i.test(h)
              ? 'election'
              : 'leader',
    );
  }
  for (const v of view) {
    if (!govChange.has(v.id) && world.turn > 1 && isFresh(world, v.leader.sinceTurn)) govChange.set(v.id, 'leader');
  }
  return { nukeUsers, struck, airstruck, govChange, latestNews: news };
}

// --------------------------------------------------------------------------
// Marker specs
// --------------------------------------------------------------------------

export interface MarkerSpec {
  key: string;
  at: [number, number];
  /** Inner HTML (rebuilt only when it changes). */
  html: string;
  className: string;
  label: string;
  offset?: [number, number];
  anchor?: maplibregl.PositionAnchor;
  /** Country id to open on click (badges only). */
  countryId?: string;
  /** Hot zone to open on click (Gaza, the West Bank). */
  hotspotId?: string;
  /** CSS custom properties (e.g. a fallout halo's size in degrees). */
  style?: Record<string, string>;
  /** Decluttering: markers with a priority hide lower-priority ones that overlap on screen. */
  priority?: number;
}

const svgCache = new Map<string, string>();
function svg(I: Icon, color: string, size: number): string {
  const k = `${I.displayName ?? I.name}:${color}:${size}`;
  let s = svgCache.get(k);
  if (!s) {
    // Static markup: safe to call from effects (no nested React root)
    s = renderToStaticMarkup(createElement(I, { size, stroke: 2, color, 'aria-hidden': true }));
    svgCache.set(k, s);
  }
  return s;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const WEIGHT: Record<string, number> = {
  gov: 6, rad: 6, pariah: 5, smoke: 4, flame: 3, crash: 3, protest: 2, lock: 2, mob: 2, nuke: 1,
};

interface Badge {
  kind: string; // css modifier: wcm-b-<kind>
  icon: Icon;
  color: string;
  label: string;
  fresh?: boolean;
  extra?: string; // extra decoration markup (smoke puffs, sparks)
}

const SMOKE = '<i class="wcm-puff"></i><i class="wcm-puff"></i><i class="wcm-puff"></i>';

const GOV_BADGE: Record<GovKind, { icon: Icon; color: string; text: string }> = {
  coup: { icon: IconCrownOff, color: '#ff7a59', text: 'Coup this month' },
  revolution: { icon: IconCrownOff, color: '#ff9f43', text: 'Revolution this month' },
  assassination: { icon: IconCrownOff, color: '#ff5a4f', text: 'Leader assassinated this month' },
  election: { icon: IconCheckbox, color: '#b48cff', text: 'Election or vote this month' },
  leader: { icon: IconCrown, color: '#b48cff', text: 'New leader this month' },
};

const pct = (g: number) => `${g >= 0 ? '+' : ''}${(g * 100).toFixed(1)}%`;

function countryBadges(
  v: PlayerViewCountry,
  sig: MapSignals,
  layer: string,
  names: Map<string, string>,
): Badge[] {
  const out: Badge[] = [];
  const gov = sig.govChange.get(v.id);
  if (gov) {
    const g = GOV_BADGE[gov];
    out.push({ kind: 'gov', icon: g.icon, color: g.color, label: `${v.name}: ${g.text} (${v.leader.title} ${v.leader.name})`, fresh: true });
  }
  const s = sig.struck.get(v.id);
  if (s) {
    out.push({
      kind: 'rad',
      icon: IconRadioactive,
      color: '#d4f03c',
      label: s.direct
        ? `${v.name}: struck by a nuclear weapon, fallout ${Math.round(s.fallout)}/100`
        : `${v.name}: radioactive fallout drifting in from a strike nearby (${Math.round(s.fallout)}/100)`,
      fresh: s.fresh,
    });
  }
  if (sig.nukeUsers.has(v.id)) {
    out.push({ kind: 'pariah', icon: IconRocket, color: '#ff4fb3', label: `${v.name} used a nuclear weapon: global embargo, pariah state` });
  }
  const by = sig.airstruck.get(v.id);
  if (by) {
    out.push({
      kind: 'smoke',
      icon: IconBomb,
      color: '#ff8a5c',
      label: `${v.name}: hit by airstrikes this month${names.get(by) ? ` (${names.get(by)})` : ''}`,
      fresh: true,
      extra: SMOKE,
    });
  }
  if (v.insurgencyLevel === 'REBELLION' || v.insurgencyLevel === 'GUERILLA') {
    out.push({
      kind: 'flame',
      icon: IconFlame,
      color: '#ff9f43',
      label: `${v.name}: ${v.insurgencyLevel === 'REBELLION' ? 'open rebellion' : 'guerilla war'}`,
    });
  } else if (v.insurgencyLevel === 'UNREST' || v.stability.estimate < 28) {
    out.push({
      kind: 'protest',
      icon: IconSpeakerphone,
      color: '#ffb347',
      label: `${v.name}: ${v.insurgencyLevel === 'UNREST' ? 'unrest in the streets' : 'government on the brink'} (stability ~${Math.round(v.stability.estimate)})`,
    });
  }
  const growth = v.growth ?? v.full?.realGrowth;
  if (growth !== undefined && growth < -0.02) {
    out.push({ kind: 'crash', icon: IconTrendingDown, color: '#ff6b5a', label: `${v.name}: economy shrinking ${pct(growth)} a year` });
  }
  if (v.underEmbargo || v.full?.underGlobalEmbargo) {
    out.push({ kind: 'lock', icon: IconLock, color: '#c9d2e0', label: `${v.name}: under embargo` });
  }
  if (v.isPlayer && (v.full?.mobilizationLevel ?? 0) >= 50) {
    out.push({ kind: 'mob', icon: IconTank, color: '#f2a93b', label: `${v.name}: mobilised (${Math.round(v.full?.mobilizationLevel ?? 0)}%)` });
  }
  if ((v.nuclearStatus === 'ARMED' || v.nuclearStatus === 'TESTED') && !s && (layer === 'nuclear' || out.length === 0)) {
    out.push({ kind: 'nuke', icon: IconRadioactive, color: '#f5d547', label: `${v.name}: nuclear ${v.nuclearStatus === 'ARMED' ? 'armed' : 'tested'}` });
  }
  return out;
}

function badgeHtml(b: Badge): string {
  return `<span class="wcm-badge wcm-b-${b.kind}${b.fresh ? ' wcm-fresh' : ''}" style="--c:${b.color}" role="img" aria-label="${esc(b.label)}" title="${esc(b.label)}">${b.extra ?? ''}${svg(b.icon, b.color, 14)}</span>`;
}

const MAX_BADGES = 3;
const MAX_MARKERS = 60;

export interface MarkerInput {
  world: WorldState;
  view: PlayerViewCountry[];
  sig: MapSignals;
  layer: string;
  centers: Record<string, [number, number]>;
  frontOf: (warIndex: number) => [number, number] | null;
}

/** Nearest other simulated country by anchor distance (a stand-in for a land neighbour). */
export function neighbours(id: string, centers: Record<string, [number, number]>, ids: string[], maxDeg = 24): string[] {
  const a = centers[id];
  if (!a) return [];
  const cos = Math.cos((a[1] * Math.PI) / 180);
  return ids
    .filter((o) => o !== id && centers[o])
    .map((o) => {
      const b = centers[o];
      return [o, Math.hypot((b[0] - a[0]) * cos, b[1] - a[1])] as const;
    })
    .filter(([, d]) => d <= maxDeg)
    .sort((x, y) => x[1] - y[1])
    .map(([o]) => o);
}

/** Screen-ish bearing (degrees, clockwise from east) from a to b on a local flat projection. */
function bearing(a: [number, number], b: [number, number]): number {
  const cos = Math.cos((a[1] * Math.PI) / 180);
  return (Math.atan2(-(b[1] - a[1]), (b[0] - a[0]) * cos) * 180) / Math.PI;
}

export interface RefugeeFlow {
  from: string;
  to: string;
  reason: string;
}

/** Refugees flee fallout and losing wars into the nearest countries not at war with them. */
export function refugeeFlows(input: Pick<MarkerInput, 'world' | 'sig' | 'centers'>): RefugeeFlow[] {
  const { world, sig, centers } = input;
  const ids = world.countries.map((c) => c.id);
  const sources = new Map<string, string>();
  for (const [id, s] of sig.struck) if (s.direct && s.fallout >= 10) sources.set(id, 'nuclear fallout');
  for (const w of world.wars) {
    if (w.frontline > 60 && !sources.has(w.defenderId)) sources.set(w.defenderId, 'a losing war');
    if (w.frontline < 40 && !sources.has(w.attackerId)) sources.set(w.attackerId, 'a losing war');
  }
  const flows: RefugeeFlow[] = [];
  for (const [from, reason] of sources) {
    const foes = new Set(world.countries.find((c) => c.id === from)?.atWarWith ?? []);
    const near = neighbours(from, centers, ids).filter((o) => !foes.has(o)).slice(0, 2);
    for (const to of near) flows.push({ from, to, reason });
  }
  return flows.slice(0, 6);
}

export function buildMarkers(input: MarkerInput): MarkerSpec[] {
  const { world, view, sig, layer, centers } = input;
  const names = new Map(view.map((v) => [v.id, v.name]));
  const ids = world.countries.map((c) => c.id);
  const specs: MarkerSpec[] = [];

  // Nuclear strike sites: a contamination halo sized by fallout, a plume drifting toward the
  // nearest neighbour, and a flash with a mushroom cloud the month it happens
  const flashes: MarkerSpec[] = [];
  for (const [id, s] of sig.struck) {
    const at = centers[id];
    if (!at || !s.direct) continue;
    const near = neighbours(id, centers, ids)[0];
    const angle = near ? bearing(at, centers[near]) : -30;
    const deg = 2.5 + (s.fallout / 100) * 9;
    specs.push({
      key: `halo:${id}`,
      at,
      className: `wcm-halo${s.fresh ? ' wcm-fresh' : ''}`,
      label: `${names.get(id) ?? id}: radioactive fallout ${Math.round(s.fallout)}/100`,
      style: { '--deg': String(deg), '--plume': `${angle}deg`, '--sev': String(Math.max(0.25, s.fallout / 100)) },
      html:
        '<i class="wcm-halo-core"></i><i class="wcm-halo-ring"></i><i class="wcm-halo-ring r2"></i>' +
        '<i class="wcm-plume"></i>',
    });
    if (s.fresh) {
      flashes.push({
        key: `flash:${id}`,
        at,
        className: 'wcm-blast wcm-fresh',
        label: `${names.get(id) ?? id}: nuclear detonation this month`,
        html:
          '<i class="wcm-flash"></i><svg class="wcm-mushroom" viewBox="0 0 40 48" aria-hidden="true"><ellipse cx="20" cy="12" rx="15" ry="9" fill="#f6e7b0"/><ellipse cx="20" cy="13" rx="10" ry="5" fill="#ffb347" opacity=".8"/><path d="M16 19 Q18 32 14 44 L26 44 Q22 32 24 19 Z" fill="#e9d8a6"/><ellipse cx="20" cy="45" rx="14" ry="3" fill="#f6e7b0" opacity=".8"/></svg>',
      });
    }
  }

  // Wars: crossed swords and blast bursts where the front stands
  world.wars.forEach((w, i) => {
    const at = input.frontOf(i);
    if (!at) return;
    const fresh = isFresh(world, w.startTurn);
    const a = names.get(w.attackerId) ?? w.attackerId;
    const d = names.get(w.defenderId) ?? w.defenderId;
    const lead = w.frontline > 55 ? `${a} advancing` : w.frontline < 45 ? `${d} pushing back` : 'stalemate';
    specs.push({
      key: `war:${w.id}`,
      at,
      className: `wcm-war${fresh ? ' wcm-fresh' : ''}`,
      priority: 100,
      label: `War: ${a} vs ${d}, front ${Math.round(w.frontline)} (${lead})`,
      html:
        `<span class="wcm-war-core" role="img" aria-label="${esc(`War front: ${a} vs ${d}, ${lead}`)}" title="${esc(`War front: ${a} vs ${d}, ${lead}`)}">` +
        '<i class="wcm-burst"></i><i class="wcm-burst b2"></i><i class="wcm-burst b3"></i>' +
        `${svg(IconSwords, '#ffd2c8', 15)}</span>`,
    });
  });

  // Refugee walkers on each flow
  for (const f of refugeeFlows(input)) {
    const a = centers[f.from];
    const b = centers[f.to];
    if (!a || !b) continue;
    const label = `Refugees fleeing ${f.reason} in ${names.get(f.from) ?? f.from} into ${names.get(f.to) ?? f.to}`;
    specs.push({
      key: `ref:${f.from}:${f.to}`,
      at: [a[0] + (b[0] - a[0]) * 0.55, a[1] + (b[1] - a[1]) * 0.55],
      className: 'wcm-refugee',
      label,
      html: `<span class="wcm-ref-core" role="img" aria-label="${esc(label)}" title="${esc(label)}">${svg(IconWalk, '#e4d9ff', 12)}</span>`,
    });
  }

  // Hot zones (Gaza, the West Bank): a burning or calm beacon with the newest incident's icon,
  // which bounces in the month it happened
  for (const h of world.hotspots ?? []) {
    const fresh = isFresh(world, h.incidents[0]?.turn);
    const { line } = heat(h);
    const label = `${hotspotLine(h)}${fresh ? ` Latest: ${h.incidents[0].title}.` : ''}`;
    const burning = h.phase === 'WAR' || h.violence >= 50;
    specs.push({
      key: `hot:${h.id}`,
      at: h.id === 'WEST_BANK' ? [h.center[0] + 0.15, h.center[1] + 0.35] : h.center,
      hotspotId: h.id,
      className: `wcm-hot${burning ? ' wcm-hot-burn' : ''}${fresh ? ' wcm-fresh' : ''}`,
      priority: 90,
      label,
      style: { '--hot': line },
      html:
        `<span class="wcm-hot-core" role="img" aria-label="${esc(label)}" title="${esc(label)}">` +
        '<i class="wcm-hot-ring"></i><i class="wcm-hot-ring r2"></i>' +
        `${svg(zoneIcon(h), '#fff4e8', 12)}</span>`,
    });
  }

  // One badge row per country, above its name
  const rows: MarkerSpec[] = [];
  for (const v of view) {
    const at = centers[v.id];
    if (!at) continue;
    const badges = countryBadges(v, sig, layer, names);
    if (badges.length === 0) continue;
    const shown = badges.slice(0, MAX_BADGES);
    const more = badges.length - shown.length;
    rows.push({
      key: `row:${v.id}`,
      at,
      anchor: 'bottom',
      offset: [0, -3],
      countryId: v.id,
      className: `wcm-row${shown.some((b) => b.fresh) ? ' wcm-fresh' : ''}`,
      priority: (v.isPlayer ? 50 : 0) + badges.reduce((n, b) => n + (WEIGHT[b.kind] ?? 1) + (b.fresh ? 4 : 0), 0),
      label: badges.map((b) => b.label).join('; '),
      html:
        shown.map(badgeHtml).join('') +
        (more > 0 ? `<span class="wcm-more" title="${esc(badges.slice(MAX_BADGES).map((b) => b.label).join('; '))}">+${more}</span>` : ''),
    });
  }
  // Fresh and dramatic rows first when capping
  rows.sort((x, y) => (y.priority ?? 0) - (x.priority ?? 0));
  return [...specs, ...rows].slice(0, MAX_MARKERS - flashes.length).concat(flashes);
}

// --------------------------------------------------------------------------
// Marker manager: keyed diff against live maplibregl.Markers
// --------------------------------------------------------------------------

interface Live {
  marker: maplibregl.Marker;
  el: HTMLElement;
  inner: HTMLElement;
  html: string;
  className: string;
  priority?: number;
}

export class StateMarkers {
  private live = new Map<string, Live>();
  private map: maplibregl.Map;
  private onPick: (id: string) => void;
  private onZone: (id: string) => void;

  private raf = 0;
  private readonly onMoveEnd = () => this.declutter();

  constructor(map: maplibregl.Map, onPick: (id: string) => void, onZone: (id: string) => void = () => {}) {
    this.map = map;
    this.onPick = onPick;
    this.onZone = onZone;
    map.on('moveend', this.onMoveEnd);
  }

  /** Hide markers that overlap a higher-priority one on screen (re-run when the camera stops). */
  declutter() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      const placed: Array<[number, number, number, number]> = [];
      const ranked = [...this.live.values()].filter((l) => l.priority !== undefined);
      ranked.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const c = this.map.getCenter();
      const rad = Math.PI / 180;
      for (const l of ranked) {
        // Far side of the globe: MapLibre fades it out, so it must not hide visible markers
        const ll = l.marker.getLngLat();
        const cosD =
          Math.sin(c.lat * rad) * Math.sin(ll.lat * rad) +
          Math.cos(c.lat * rad) * Math.cos(ll.lat * rad) * Math.cos((ll.lng - c.lng) * rad);
        if (this.map.getZoom() < 4 && cosD < 0.1) continue;
        const p = this.map.project(ll);
        const off = l.marker.getOffset();
        const w = l.inner.offsetWidth || 24;
        const h = l.inner.offsetHeight || 24;
        const bottomAnchored = l.className.startsWith('wcm-row');
        const x0 = p.x + off.x - w / 2;
        const y0 = p.y + off.y - (bottomAnchored ? h : h / 2);
        const box: [number, number, number, number] = [x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1];
        const hit = placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
        l.el.style.visibility = hit ? 'hidden' : '';
        if (!hit) placed.push(box);
      }
    });
  }

  sync(specs: MarkerSpec[]) {
    const keep = new Set<string>();
    for (const s of specs) {
      keep.add(s.key);
      let l = this.live.get(s.key);
      if (!l) {
        const el = document.createElement('div');
        el.className = 'wcm';
        if (s.className.startsWith('wcm-halo') || s.className.startsWith('wcm-blast')) el.style.pointerEvents = 'none';
        if (s.className.startsWith('wcm-blast')) el.style.zIndex = '3';
        const inner = document.createElement('div');
        el.appendChild(inner);
        if (s.countryId) {
          const id = s.countryId;
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onPick(id);
          });
        } else if (s.hotspotId) {
          const id = s.hotspotId;
          el.style.cursor = 'pointer';
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onZone(id);
          });
        }
        const marker = new maplibregl.Marker({
          element: el,
          anchor: s.anchor ?? 'center',
          offset: s.offset ?? [0, 0],
          opacityWhenCovered: '0',
        })
          .setLngLat(s.at)
          .addTo(this.map);
        l = { marker, el, inner, html: '', className: '' };
        this.live.set(s.key, l);
      } else {
        l.marker.setLngLat(s.at);
      }
      if (l.html !== s.html) {
        l.inner.innerHTML = s.html;
        l.html = s.html;
      }
      if (l.className !== s.className) {
        l.inner.className = s.className;
        l.className = s.className;
      }
      l.inner.setAttribute('aria-label', s.label);
      l.priority = s.priority;
      for (const [k, v] of Object.entries(s.style ?? {})) l.inner.style.setProperty(k, v);
    }
    for (const [k, l] of this.live) {
      if (!keep.has(k)) {
        l.marker.remove();
        this.live.delete(k);
      }
    }
    this.declutter();
  }

  clear() {
    cancelAnimationFrame(this.raf);
    this.map.off('moveend', this.onMoveEnd);
    for (const l of this.live.values()) l.marker.remove();
    this.live.clear();
  }
}
