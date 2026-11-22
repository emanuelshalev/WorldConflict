import { type JSX, useEffect, useMemo, useState } from 'react';
import type { CodexMap as CodexMapData } from '../../lib/codexMatch';
import { type Ring, type WorldGeo, bbox, featureId, loadWorld, mainRing, outerRings, worldIfLoaded } from '../../scenes/worldGeo';
import { placeName } from './explain';

/**
 * The small map of an explainer or situation briefing (design-learn.md §4, §10): the same
 * Natural Earth polygons as the desk's ContextMap and OutcomeMap (one cached fetch), framed on
 * the entry's first country and its points. Static SVG, no motion. The countries and points are
 * also named in `aria-label` and in the text around it, so the map adds no information that is
 * only visual.
 */

const W = 640;
const H = 360;
type P = [number, number];

function frame(geo: WorldGeo, data: CodexMapData) {
  const focus = data.countries[0];
  const ring = focus ? mainRing(geo, focus) : null;
  let box: [number, number, number, number] | null = ring ? bbox(ring) : null;
  for (const p of data.points) {
    box = box ? [Math.min(box[0], p.lon), Math.min(box[1], p.lat), Math.max(box[2], p.lon), Math.max(box[3], p.lat)] : [p.lon - 4, p.lat - 3, p.lon + 4, p.lat + 3];
  }
  if (!box) return null;
  const cx = (box[0] + box[2]) / 2;
  const cy = (box[1] + box[3]) / 2;
  const f = 1 / Math.max(0.5, Math.cos((cy * Math.PI) / 180));
  const lonW = Math.max(box[2] - box[0], 6);
  const latH = Math.max(box[3] - box[1], 4);
  const sx = Math.min(W / (lonW * 1.35), H / (latH * f * 1.35));
  const sy = sx * f;
  const pr = ([x, y]: P): P => [(x - cx) * sx + W / 2, -(y - cy) * sy + H / 2];
  const lonMin = cx - W / 2 / sx - 5;
  const lonMax = cx + W / 2 / sx + 5;
  const latMin = cy - H / 2 / sy - 5;
  const latMax = cy + H / 2 / sy + 5;
  const path = (r: Ring) => {
    let d = '';
    let last: P = [Infinity, Infinity];
    r.forEach((pt, i) => {
      const q = pr(pt);
      if (i > 0 && i < r.length - 1 && Math.abs(q[0] - last[0]) + Math.abs(q[1] - last[1]) < 1.5) return;
      d += `${i === 0 ? 'M' : 'L'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
      last = q;
    });
    return `${d}Z`;
  };
  const shown = new Set(data.countries);
  const land: string[] = [];
  const lit: Array<{ id: string; d: string }> = [];
  for (const feat of geo.features) {
    const id = featureId(feat);
    let d = '';
    for (const r of outerRings(feat)) {
      const b = bbox(r);
      if (b[2] < lonMin || b[0] > lonMax || b[3] < latMin || b[1] > latMax) continue;
      d += path(r);
    }
    if (!d) continue;
    if (shown.has(id)) lit.push({ id, d });
    else land.push(d);
  }
  return { land: land.join(''), lit, points: data.points.map((p) => ({ ...p, at: pr([p.lon, p.lat]) })) };
}

export function CodexMap({ data, label }: { data: CodexMapData; label: string }): JSX.Element | null {
  const [geo, setGeo] = useState<WorldGeo | null>(() => worldIfLoaded());
  useEffect(() => {
    if (geo) return;
    let live = true;
    loadWorld().then(
      (g) => live && setGeo(g),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [geo]);
  const scene = useMemo(() => (geo ? frame(geo, data) : null), [geo, data]);
  const names = [...data.countries.map((id) => placeName(id)), ...data.points.map((p) => p.name)];
  const aria = `${label}. Map showing ${names.join(', ')}.`;
  if (!scene) return <div className="lx-map lx-map-empty" role="img" aria-label={aria} />;
  return (
    <figure className="lx-map" role="img" aria-label={aria}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width={W} height={H} className="lx-map-sea" />
        <path d={scene.land} className="lx-map-land" />
        {scene.lit.map((c, i) => (
          <path key={c.id} d={c.d} className={i === 0 ? 'lx-map-focus' : 'lx-map-other'} />
        ))}
        {scene.points.map((p) => (
          <g key={p.name} transform={`translate(${p.at[0].toFixed(1)} ${p.at[1].toFixed(1)})`}>
            <circle r="13" className="lx-map-ring" />
            <circle r="4.5" className="lx-map-dot" />
            <text x="10" y="-9" className="lx-map-label">
              {p.name}
            </text>
          </g>
        ))}
      </svg>
      {data.countries.length > 0 && (
        <figcaption className="lx-map-key">
          {data.countries.slice(0, 3).map((id, i) => (
            <span key={id}>
              <i className={i === 0 ? 'k-focus' : 'k-other'} aria-hidden /> {placeName(id)}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
