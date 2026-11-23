/**
 * Tap tolerance on the map (QA3R-5d): a tap 20 px off Taiwan, or between two Philippine islands,
 * did nothing because only the polygon under the pointer counted. When nothing is under the
 * pointer, the countries drawn within TAP_SLOP px are candidates and the smallest one wins (a
 * small island state is the one a near miss was aimed at, never the continent beside it).
 */
export const TAP_SLOP = 16;

type Position = number[];
interface GeometryLike {
  type: string;
  coordinates?: unknown;
}
export interface PickCandidate {
  id: string;
  geometry?: GeometryLike | null;
}

/** Bounding box area (degrees squared) of a polygon or multipolygon, Infinity when unknown. */
export function bboxArea(g: GeometryLike | null | undefined): number {
  if (!g || !g.coordinates) return Number.POSITIVE_INFINITY;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c: unknown) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === 'number') {
      const [x, y] = c as Position;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      return;
    }
    for (const x of c) walk(x);
  };
  walk(g.coordinates);
  return Number.isFinite(minX) ? (maxX - minX) * (maxY - minY) : Number.POSITIVE_INFINITY;
}

/** The country a near miss meant: the smallest one among the candidates (ties: first drawn). */
export function pickNear(candidates: readonly PickCandidate[]): string | undefined {
  let best: { id: string; area: number } | undefined;
  for (const c of candidates) {
    if (!c.id) continue;
    const area = bboxArea(c.geometry);
    if (!best || area < best.area) best = { id: c.id, area };
  }
  return best?.id;
}
