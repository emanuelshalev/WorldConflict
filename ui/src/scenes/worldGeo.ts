/**
 * Shared Natural Earth helpers for the live map (MapView) and the outcome map (OutcomeMap):
 * one cached fetch of /world.geojson, ring extraction and a "where do these two countries meet"
 * estimate (closest pair of vertices between their main landmasses).
 */

export type Ring = [number, number][];
export type WorldGeo = GeoJSON.FeatureCollection;

let worldPromise: Promise<WorldGeo> | null = null;
let worldCache: WorldGeo | null = null;

/** The world polygons, fetched once per page load. */
export function loadWorld(): Promise<WorldGeo> {
  if (!worldPromise) {
    worldPromise = fetch('/world.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`world.geojson ${r.status}`);
        return r.json() as Promise<WorldGeo>;
      })
      .then((geo) => {
        worldCache = geo;
        return geo;
      })
      .catch((e) => {
        worldPromise = null; // allow a retry later
        throw e;
      });
  }
  return worldPromise;
}

/** The polygons if they already arrived (lets components render on the first frame). */
export function worldIfLoaded(): WorldGeo | null {
  return worldCache;
}

export function featureId(f: GeoJSON.Feature): string {
  return ((f.properties as Record<string, unknown> | null)?.ADM0_A3 as string) ?? '';
}

export function rings(f: GeoJSON.Feature): Ring[] {
  const g = f.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return g.coordinates as Ring[];
  if (g.type === 'MultiPolygon') return (g.coordinates as Ring[][]).map((p) => p[0]);
  return [];
}

/** Outer rings only (no holes), biggest first. */
export function outerRings(f: GeoJSON.Feature): Ring[] {
  const g = f.geometry;
  if (!g) return [];
  const list: Ring[] =
    g.type === 'Polygon'
      ? [g.coordinates[0] as Ring]
      : g.type === 'MultiPolygon'
        ? (g.coordinates as Ring[][]).map((p) => p[0])
        : [];
  return [...list].sort((a, b) => ringArea(b) - ringArea(a));
}

function ringArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}

const featureIndex = new WeakMap<WorldGeo, Map<string, GeoJSON.Feature>>();

export function findFeature(geo: WorldGeo, id: string): GeoJSON.Feature | undefined {
  let idx = featureIndex.get(geo);
  if (!idx) {
    idx = new Map(geo.features.map((f) => [featureId(f), f]));
    featureIndex.set(geo, idx);
  }
  return idx.get(id);
}

/** The main landmass ring of a country (contiguous US, mainland France...). */
export function mainRing(geo: WorldGeo, id: string): Ring | null {
  const f = findFeature(geo, id);
  return f ? (outerRings(f)[0] ?? null) : null;
}

/** Natural Earth's own label point, else the main ring's bbox centre. */
export function labelPoint(geo: WorldGeo, id: string): [number, number] | null {
  const f = findFeature(geo, id);
  if (!f) return null;
  const p = f.properties as Record<string, unknown> | null;
  if (typeof p?.LABEL_X === 'number' && typeof p?.LABEL_Y === 'number') return [p.LABEL_X, p.LABEL_Y];
  const r = outerRings(f)[0];
  if (!r) return null;
  const b = bbox(r);
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}

export function bbox(r: Ring): [number, number, number, number] {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of r) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

const meetCache = new Map<string, { a: [number, number]; b: [number, number]; gap: number }>();

/**
 * Closest pair of vertices between two countries' main landmasses (a on `fromId`, b on `toId`)
 * and the gap between them in degrees (cos-lat corrected). Neighbours meet on their border.
 */
export function closestPair(
  geo: WorldGeo,
  fromId: string,
  toId: string,
): { a: [number, number]; b: [number, number]; gap: number } | null {
  const key = `${fromId}>${toId}`;
  const hit = meetCache.get(key);
  if (hit) return hit;
  const fa = findFeature(geo, fromId);
  const fb = findFeature(geo, toId);
  if (!fa || !fb) return null;
  // Main ring plus the next largest (covers Alaska-less US, Kaliningrad-less Russia sensibly)
  const ra = outerRings(fa).slice(0, 2);
  const rb = outerRings(fb).slice(0, 2);
  let best = Infinity;
  let a: [number, number] = [0, 0];
  let b: [number, number] = [0, 0];
  for (const r1 of ra) {
    const step1 = Math.max(1, Math.floor(r1.length / 400));
    for (const r2 of rb) {
      const step2 = Math.max(1, Math.floor(r2.length / 400));
      for (let i = 0; i < r1.length; i += step1) {
        const p = r1[i];
        const k = Math.cos((p[1] * Math.PI) / 180);
        for (let j = 0; j < r2.length; j += step2) {
          const q = r2[j];
          const dx = (p[0] - q[0]) * k;
          const dy = p[1] - q[1];
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            a = p;
            b = q;
          }
        }
      }
    }
  }
  if (!Number.isFinite(best)) return null;
  const out = { a, b, gap: Math.sqrt(best) };
  meetCache.set(key, out);
  return out;
}

/**
 * Where a force from `fromId` stands facing `toId`: on the shared border for neighbours,
 * otherwise just off the target's coast on the side facing the deployer.
 */
export function frontPoint(geo: WorldGeo, fromId: string, toId: string): [number, number] | null {
  const m = closestPair(geo, fromId, toId);
  if (!m) return null;
  if (m.gap < 3) return [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2];
  const d = Math.hypot(m.a[0] - m.b[0], m.a[1] - m.b[1]) || 1;
  const pull = Math.min(2.5, d / 2) / d;
  return [m.b[0] + (m.a[0] - m.b[0]) * pull, m.b[1] + (m.a[1] - m.b[1]) * pull];
}
