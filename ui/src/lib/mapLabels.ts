/**
 * Country names on the globes (design-worldmap.md 3.2). Pure: one label point per country
 * (Natural Earth LABEL_X / LABEL_Y), a tier by importance and size, a sort key for collisions, and
 * the anachronism guard for older eras. MapLibre places the result as one symbol layer.
 */

export type LngLat = [number, number];

export interface LabelOptions {
  /** Display names by ADM0_A3 code (game and era names); overrides Natural Earth NAME. */
  names?: Record<string, string>;
  /** The simulated countries (roster): semibold, and never hidden by the era guard. Default ROSTER. */
  roster?: Iterable<string>;
  /** Era status of countries that are not states (label in italics, e.g. "Ukrainian SSR"). */
  eraStatus?: Record<string, { status: 'PART_OF' | 'NOT_INDEPENDENT'; label: string }>;
  /** Polygons painted as part of another country (no label of their own unless in eraStatus). */
  merged?: Iterable<string>;
  /** Era-only names (Czechoslovakia, Yugoslavia), rank 2 or 3. */
  mapLabels?: { at: LngLat; name: string; rank: number }[];
  /** Non-roster names allowed in an older era. */
  labelAllow?: string[];
  /** Hide non-roster modern names (outside labelAllow). Default: on when the era has eraStatus or mapLabels. */
  restrict?: boolean;
  /** Countries in the selected situation (or every pinned crisis): tier 0. */
  sides?: Iterable<string>;
  selected?: string | null;
  player?: string | null;
}

export interface LabelProps {
  id: string;
  name: string;
  /** 0 selected / player / sides, 1 > 2.5M km2, 2 0.4M to 2.5M km2, 3 smaller. */
  tier: 0 | 1 | 2 | 3;
  /** symbol-sort-key: lower is placed first (wins collisions). */
  sort: number;
  italic: boolean;
  /** Non-roster, regular weight, dimmer ink. */
  muted: boolean;
  /** Text size in px; never under 13 (FEEL legibility floor). */
  size: number;
}

export type LabelFeature = GeoJSON.Feature<GeoJSON.Point, LabelProps>;

export const LABEL_MIN_PX = 13;
export const TIER1_KM2 = 2_500_000;
export const TIER2_KM2 = 400_000;

/** Fontstacks served from /glyphs (ui/public/glyphs): the Latin ranges 0-255 and 256-511. */
export const FONT_REGULAR = ['Open Sans Regular', 'Arial Unicode MS Regular'];
export const FONT_SEMIBOLD = ['Open Sans Semibold'];
export const FONT_ITALIC = ['Noto Sans Italic'];
export const GLYPHS_URL = '/glyphs/{fontstack}/{range}.pbf';

/** The 41 simulated countries (mirrors TIER1_COUNTRIES in src/core/types.ts; a test keeps them equal). */
export const ROSTER: readonly string[] = [
  'USA', 'CHN', 'RUS', 'GBR', 'FRA', 'DEU', 'JPN', 'IND', 'BRA', 'CAN', 'ITA', 'KOR', 'AUS', 'MEX',
  'IDN', 'TUR', 'SAU', 'POL', 'ZAF', 'NGA', 'EGY', 'IRN', 'ISR', 'PAK', 'PRK', 'UKR', 'TWN', 'VEN',
  'SYR', 'IRQ', 'AFG', 'ARE', 'BLR', 'CUB', 'DNK', 'ETH', 'LBN', 'PHL', 'PSX', 'SDN', 'YEM',
];

/** Natural Earth names that are too long or formal for a globe label. */
const SHORT: Record<string, string> = {
  USA: 'United States',
  COD: 'DR Congo',
  CAF: 'Central African Rep.',
  BIH: 'Bosnia',
  DOM: 'Dominican Rep.',
  PSX: 'West Bank',
};

const R = 6371.0088; // km
const rad = Math.PI / 180;

/** Spherical area of a ring in km2 (the d3 / turf formula). */
export function ringAreaKm2(ring: LngLat[]): number {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [l1, p1] = ring[i];
    const [l2, p2] = ring[(i + 1) % n];
    s += (l2 - l1) * rad * (2 + Math.sin(p1 * rad) + Math.sin(p2 * rad));
  }
  return Math.abs((s * R * R) / 2);
}

/** Area of a country feature in km2: outer rings minus holes. */
export function featureAreaKm2(f: GeoJSON.Feature): number {
  const g = f.geometry;
  if (!g) return 0;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  let a = 0;
  for (const poly of polys) {
    (poly as LngLat[][]).forEach((ring, i) => {
      a += (i === 0 ? 1 : -1) * ringAreaKm2(ring);
    });
  }
  return Math.max(0, a);
}

interface Base {
  id: string;
  neName: string;
  at: LngLat;
  area: number;
}

const baseCache = new WeakMap<object, Base[]>();

/** Label points and areas, computed once per geo object (memoized). */
function bases(geo: GeoJSON.FeatureCollection): Base[] {
  const hit = baseCache.get(geo);
  if (hit) return hit;
  const out: Base[] = [];
  for (const f of geo.features) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const id = p.ADM0_A3 as string | undefined;
    const x = Number(p.LABEL_X);
    const y = Number(p.LABEL_Y);
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({ id, neName: SHORT[id] ?? String(p.NAME ?? id), at: [x, y], area: featureAreaKm2(f) });
  }
  baseCache.set(geo, out);
  return out;
}

const tierOfArea = (km2: number): 1 | 2 | 3 => (km2 > TIER1_KM2 ? 1 : km2 >= TIER2_KM2 ? 2 : 3);

export const labelSize = (tier: number): number => (tier <= 1 ? 15 : LABEL_MIN_PX);

/**
 * The label features for one map. Deterministic order (by sort key, then id) so the same inputs
 * always give the same placement.
 */
export function labelFeatures(geo: GeoJSON.FeatureCollection, opts: LabelOptions = {}): LabelFeature[] {
  const roster = new Set(opts.roster ?? ROSTER);
  const sides = new Set(opts.sides ?? []);
  const merged = new Set(opts.merged ?? []);
  const era = opts.eraStatus ?? {};
  const allow = new Set(opts.labelAllow ?? []);
  const restrict = opts.restrict ?? (Object.keys(era).length > 0 || (opts.mapLabels?.length ?? 0) > 0);

  const rows: { at: LngLat; p: Omit<LabelProps, 'sort'>; area: number; roster: boolean }[] = [];
  for (const b of bases(geo)) {
    const inRoster = roster.has(b.id);
    const status = era[b.id];
    if (merged.has(b.id) && !status) continue; // painted as its parent, no name of its own
    if (restrict && !inRoster && !allow.has(b.id) && !status) continue; // anachronism guard
    const top = b.id === opts.selected || b.id === opts.player || sides.has(b.id);
    const tier = top ? 0 : tierOfArea(b.area);
    const italic = !!status;
    const name = status?.label ?? opts.names?.[b.id] ?? b.neName;
    rows.push({
      at: b.at,
      area: b.area,
      roster: inRoster,
      p: { id: b.id, name, tier, italic, muted: !inRoster && !top, size: labelSize(tier) },
    });
  }
  for (const [i, l] of (opts.mapLabels ?? []).entries()) {
    const tier = l.rank <= 2 ? 2 : 3;
    rows.push({
      at: l.at,
      area: 0,
      roster: false,
      p: { id: `era-${i}`, name: l.name, tier, italic: true, muted: false, size: labelSize(tier) },
    });
  }
  // Within a tier: roster first, then the bigger country
  rows.sort(
    (a, b) =>
      a.p.tier - b.p.tier ||
      Number(b.roster) - Number(a.roster) ||
      b.area - a.area ||
      (a.p.id < b.p.id ? -1 : a.p.id > b.p.id ? 1 : 0),
  );
  return rows.map((r, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: r.at },
    properties: { ...r.p, sort: r.p.tier * 1000 + i },
  }));
}

/**
 * The highest tier shown at a zoom, relative to the fit zoom (3.2 table): desktop shows tiers 0 to
 * 2 at fit and tier 3 from fit + 0.8; phones show tiers 0 and 1 at fit, tier 2 from fit + 0.6.
 */
export function maxTierAt(zoom: number, fit: number, phone: boolean): 1 | 2 | 3 {
  const d = zoom - fit + 1e-6; // float slack: fit + 0.8 counts as 0.8
  if (phone) return d >= 1.2 ? 3 : d >= 0.6 ? 2 : 1;
  return d >= 0.8 ? 3 : 2;
}

/**
 * The label layer filter at a zoom. On a phone at fit, the simulated nations of tier 2 (the ones a
 * player can lead) also show, so the small globe still carries 6+ names before any situation.
 */
export function labelFilter(zoom: number, fit: number, phone: boolean): unknown[] {
  const max = maxTierAt(zoom, fit, phone);
  const byTier = ['<=', ['get', 'tier'], max];
  if (!phone || max >= 2) return byTier;
  return ['any', byTier, ['all', ['==', ['get', 'tier'], 2], ['!', ['get', 'muted']]]];
}
