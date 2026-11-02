import { type CSSProperties, type JSX, type ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { countryName } from '../store/gameStore';
import {
  type Ring,
  type WorldGeo,
  bbox,
  closestPair,
  featureId,
  findFeature,
  labelPoint,
  loadWorld,
  mainRing,
  outerRings,
  worldIfLoaded,
} from './worldGeo';

/**
 * A small animated locator map for the outcome reel: frames the player's country and the
 * target (equirectangular crop around both), colours them, and plays the order's effect.
 * Pure SVG + SMIL (no MapLibre), one cached fetch of /world.geojson for every instance.
 */

export type MapEffect =
  | 'deploy'
  | 'withdraw'
  | 'strike'
  | 'nuke'
  | 'alliance'
  | 'court'
  | 'denounce'
  | 'covert'
  | 'ceasefire'
  | 'war'
  | 'none';

export interface OutcomeMapProps {
  home: string;
  target?: string;
  effect: MapEffect;
  ok: boolean;
  label?: string;
}

const W = 1600;
const H = 900;
type P = [number, number];

const C = {
  ocean: '#0e1a2b',
  oceanEdge: '#060a12',
  grid: '#172539',
  land: '#1f2a3a',
  landLine: '#2d3a4e',
  home: '#f2a93b',
  homeLine: '#ffd08a',
  red: '#e5383b',
  redLine: '#ff7a6b',
  blue: '#3d8bfd',
  blueLine: '#8cbcff',
  intel: '#4fb3d9',
  nuke: '#f5d547',
  white: '#f4f7fb',
  fail: '#6b7686',
  failLine: '#8b95a5',
  dark: '#0a0f18',
};

const HOSTILE = new Set<MapEffect>(['strike', 'nuke', 'denounce', 'covert', 'war', 'deploy']);
const FRIENDLY = new Set<MapEffect>(['alliance', 'court', 'ceasefire', 'withdraw']);

const NAME_FIX: Record<string, string> = { USA: 'United States', PSX: 'Palestine', COD: 'DR Congo', CAF: 'C. African Rep.' };

function displayName(geo: WorldGeo, id: string): string {
  const fromGame = countryName(id);
  if (fromGame && fromGame !== id) return fromGame;
  if (NAME_FIX[id]) return NAME_FIX[id];
  const p = findFeature(geo, id)?.properties as Record<string, unknown> | undefined;
  return (p?.NAME as string) ?? id;
}

// ----------------------------------------------------------------------------
// Framing and projection
// ----------------------------------------------------------------------------
interface Scene {
  land: string;
  home: string;
  target: string;
  grid: string;
  A: P; // home anchor
  B: P | null; // target anchor
  F: P | null; // where they meet (border, or the target's near coast)
  homeName: string;
  targetName: string;
}

function buildScene(geo: WorldGeo, home: string, target: string | undefined): Scene | null {
  const hr = mainRing(geo, home);
  if (!hr) return null;
  const tgt = target && target !== home ? target : undefined;
  const tr = tgt ? mainRing(geo, tgt) : null;
  const hb = bbox(hr);
  // Shift the target a whole turn east or west if that brings the two closer (Pacific pairs)
  let shift = 0;
  let box: [number, number, number, number] = hb;
  if (tr) {
    const tb = bbox(tr);
    let best = Infinity;
    for (const s of [0, -360, 360]) {
      const w = Math.max(hb[2], tb[2] + s) - Math.min(hb[0], tb[0] + s);
      if (w < best - 1) {
        best = w;
        shift = s;
      }
    }
    box = [Math.min(hb[0], tb[0] + shift), Math.min(hb[1], tb[1]), Math.max(hb[2], tb[2] + shift), Math.max(hb[3], tb[3])];
  }
  const cx = (box[0] + box[2]) / 2;
  const cy = (box[1] + box[3]) / 2;
  const f = 1 / Math.max(0.55, Math.cos((cy * Math.PI) / 180)); // latitude stretch
  const lonW = Math.max(box[2] - box[0], 8);
  const latH = Math.max(box[3] - box[1], 5);
  const pad = tr ? 1.45 : 2.4;
  let sx = Math.min(W / (lonW * pad), H / (latH * f * pad));
  sx = Math.min(sx, W / 24); // never closer than ~24 degrees across
  const sy = sx * f;
  const pr = ([x, y]: P): P => [(x - cx) * sx + W / 2, -(y - cy) * sy + H / 2];
  const viewLon: [number, number] = [cx - W / 2 / sx, cx + W / 2 / sx];
  const viewLat: [number, number] = [cy - H / 2 / sy, cy + H / 2 / sy];

  const ringPath = (r: Ring, off: number): string => {
    let d = '';
    let lx = Infinity;
    let ly = Infinity;
    for (let i = 0; i < r.length; i++) {
      const [x, y] = pr([r[i][0] + off, r[i][1]]);
      if (i > 0 && i < r.length - 1 && Math.abs(x - lx) + Math.abs(y - ly) < 2.5) continue;
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      lx = x;
      ly = y;
    }
    return `${d}Z`;
  };
  let land = '';
  let homeD = '';
  let targetD = '';
  for (const feat of geo.features) {
    const id = featureId(feat);
    for (const r of outerRings(feat)) {
      const b = bbox(r);
      for (const off of [0, -360, 360]) {
        if (b[2] + off < viewLon[0] || b[0] + off > viewLon[1] || b[3] < viewLat[0] || b[1] > viewLat[1]) continue;
        const d = ringPath(r, off);
        if (id === home) homeD += d;
        else if (tgt && id === tgt) targetD += d;
        else land += d;
      }
    }
  }
  // Graticule every 10 degrees inside the view
  let grid = '';
  for (let lon = Math.ceil(viewLon[0] / 10) * 10; lon <= viewLon[1]; lon += 10) {
    const [x] = pr([lon, 0]);
    grid += `M${x.toFixed(1)} 0V${H}`;
  }
  for (let lat = Math.ceil(viewLat[0] / 10) * 10; lat <= viewLat[1]; lat += 10) {
    const [, y] = pr([0, lat]);
    grid += `M0 ${y.toFixed(1)}H${W}`;
  }

  const la = labelPoint(geo, home) ?? [(hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2];
  const A = pr(la);
  let B: P | null = null;
  let F: P | null = null;
  if (tgt && tr) {
    const lb = labelPoint(geo, tgt);
    const tb = bbox(tr);
    B = pr(lb ? [lb[0] + shift, lb[1]] : [(tb[0] + tb[2]) / 2 + shift, (tb[1] + tb[3]) / 2]);
    const m = shift === 0 ? closestPair(geo, home, tgt) : null;
    if (m && m.gap < 3) F = pr([(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2]);
    else if (m) {
      // Not neighbours: the target's near coast, on the side facing home
      const pa = pr(m.a);
      const pb = pr(m.b);
      F = lerp(pb, pa, Math.min(0.35, 60 / Math.max(1, dist(pa, pb))));
    } else F = lerp(A, B, 0.6);
  }
  return {
    land,
    home: homeD,
    target: targetD,
    grid,
    A,
    B,
    F,
    homeName: displayName(geo, home),
    targetName: tgt ? displayName(geo, tgt) : '',
  };
}

// ----------------------------------------------------------------------------
// Geometry helpers (projected space)
// ----------------------------------------------------------------------------
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const angle = (a: P, b: P) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
const fmt = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Control point of an arc that bows upward (towards the top of the frame). */
function bowCtrl(a: P, b: P, bow: number): P {
  const m = lerp(a, b, 0.5);
  const len = dist(a, b);
  let nx = -(b[1] - a[1]) / (len || 1);
  let ny = (b[0] - a[0]) / (len || 1);
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return [m[0] + nx * len * bow, m[1] + ny * len * bow];
}

/** A quadratic from a to b (control c), cut at t (de Casteljau) for effects that stop short. */
function quadPath(a: P, c: P, b: P, t = 1): string {
  if (t >= 1) return `M${fmt(a)}Q${fmt(c)} ${fmt(b)}`;
  const p1 = lerp(a, c, t);
  const p2 = lerp(p1, lerp(c, b, t), t);
  return `M${fmt(a)}Q${fmt(p1)} ${fmt(p2)}`;
}
function quadAt(a: P, c: P, b: P, t: number): P {
  return lerp(lerp(a, c, t), lerp(c, b, t), t);
}
/** A point d units before b, along a to b (so markers sit just off the anchor). */
function shortOf(a: P, b: P, d: number): P {
  const L = dist(a, b);
  return L <= d ? a : lerp(a, b, (L - d) / L);
}
function perp(a: P, b: P): P {
  const L = dist(a, b) || 1;
  return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
}

// ----------------------------------------------------------------------------
// Animation helpers: SMIL when moving, the final frame when reduced motion is on
// ----------------------------------------------------------------------------
interface Ctx {
  still: boolean;
  uid: string;
}
const EASE = { calcMode: 'spline', keyTimes: '0;1', keySplines: '0.25 0.7 0.3 1' } as const;

function Anim({ ctx, attr, from, to, begin, dur, repeat, ease = true }: {
  ctx: Ctx;
  attr: string;
  from: string | number;
  to: string | number;
  begin: number;
  dur: number;
  repeat?: number | 'indefinite';
  ease?: boolean;
}) {
  if (ctx.still) return null;
  return (
    <animate
      attributeName={attr}
      from={String(from)}
      to={String(to)}
      begin={`${begin}s`}
      dur={`${dur}s`}
      fill="freeze"
      repeatCount={repeat === undefined ? undefined : String(repeat)}
      {...(ease ? EASE : {})}
    />
  );
}

/** Values animation (keyframes), e.g. a flash 0 to 1 to 0. */
function Keys({ ctx, attr, values, begin, dur, repeat }: {
  ctx: Ctx;
  attr: string;
  values: string;
  begin: number;
  dur: number;
  repeat?: number | 'indefinite';
}) {
  if (ctx.still) return null;
  return (
    <animate
      attributeName={attr}
      values={values}
      begin={`${begin}s`}
      dur={`${dur}s`}
      fill="freeze"
      repeatCount={repeat === undefined ? undefined : String(repeat)}
    />
  );
}

/** Appears at `begin` (opacity 0 to `to`). */
function FadeIn({ ctx, begin, dur = 0.35, to = 1, children }: { ctx: Ctx; begin: number; dur?: number; to?: number; children: ReactNode }) {
  return (
    <g opacity={ctx.still ? to : 0}>
      <Anim ctx={ctx} attr="opacity" from={0} to={to} begin={begin} dur={dur} ease={false} />
      {children}
    </g>
  );
}

/** A path that draws itself from its start (solid or dashed) between begin and begin+dur. */
function DrawPath({ ctx, id, d, stroke, width, dash, begin, dur, opacity = 1, cap = 'round' }: {
  ctx: Ctx;
  id: string;
  d: string;
  stroke: string;
  width: number;
  dash?: string;
  begin: number;
  dur: number;
  opacity?: number;
  cap?: 'round' | 'butt';
}) {
  const maskId = `${ctx.uid}-${id}`;
  return (
    <g opacity={opacity}>
      {!ctx.still && (
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={width + 14} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}>
            <Anim ctx={ctx} attr="stroke-dashoffset" from={1} to={0} begin={begin} dur={dur} />
          </path>
        </mask>
      )}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap={cap}
        strokeDasharray={dash}
        mask={ctx.still ? undefined : `url(#${maskId})`}
      />
    </g>
  );
}

/** Expanding, fading rings at p (impacts, pulses). */
function Rings({ ctx, p, color, r0, r1, n = 3, begin, dur = 1.1, repeat = 2, width = 5 }: {
  ctx: Ctx;
  p: P;
  color: string;
  r0: number;
  r1: number;
  n?: number;
  begin: number;
  dur?: number;
  repeat?: number | 'indefinite';
  width?: number;
}) {
  if (ctx.still) return <circle cx={p[0]} cy={p[1]} r={(r0 + r1) / 2} fill="none" stroke={color} strokeWidth={width} opacity={0.5} />;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={r0} fill="none" stroke={color} strokeWidth={width} opacity={0}>
          <animate attributeName="r" from={r0} to={r1} begin={`${begin + i * (dur / n)}s`} dur={`${dur}s`} repeatCount={String(repeat)} />
          <animate attributeName="opacity" values="0.95;0" begin={`${begin + i * (dur / n)}s`} dur={`${dur}s`} repeatCount={String(repeat)} />
        </circle>
      ))}
    </g>
  );
}

/** Moves its children from a to b (they are drawn around the origin). */
function Mover({ ctx, a, b, begin, dur, rotate = 0, children, path }: {
  ctx: Ctx;
  a: P;
  b: P;
  begin: number;
  dur: number;
  rotate?: number;
  children: ReactNode;
  path?: string; // custom motion path, relative to a
}) {
  const end = ctx.still ? b : a;
  return (
    <g transform={`translate(${fmt(end)})`}>
      <g>
        {!ctx.still && (
          <animateMotion
            path={path ?? `M0 0L${(b[0] - a[0]).toFixed(1)} ${(b[1] - a[1]).toFixed(1)}`}
            begin={`${begin}s`}
            dur={`${dur}s`}
            fill="freeze"
            {...EASE}
            keyPoints="0;1"
          />
        )}
        <g transform={`rotate(${rotate.toFixed(1)})`}>{children}</g>
      </g>
    </g>
  );
}

// ----------------------------------------------------------------------------
// Glyphs (drawn around 0,0, pointing +x where it matters)
// ----------------------------------------------------------------------------
function UnitGlyph({ color }: { color: string }) {
  return (
    <g>
      <rect x={-30} y={-19} width={60} height={38} rx={6} fill={C.dark} stroke={color} strokeWidth={4} />
      <path d="M-14 -10L-2 0L-14 10M2 -10L14 0L2 10" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
function Badge({ color, children, r = 34 }: { color: string; children: ReactNode; r?: number }) {
  return (
    <g>
      <circle r={r} fill={C.dark} stroke={color} strokeWidth={4} />
      <g stroke={color} fill="none" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </g>
  );
}
const LinkGlyph = () => (
  <>
    <rect x={-20} y={-9} width={24} height={18} rx={9} />
    <rect x={-4} y={-9} width={24} height={18} rx={9} />
  </>
);
const HeartGlyph = () => <path d="M0 14C-16 3-20-4-17-10C-14-16-5-16 0-9C5-16 14-16 17-10C20-4 16 3 0 14Z" />;
const EyeGlyph = ({ slash }: { slash?: boolean }) => (
  <>
    <path d="M-20 0C-12-11 12-11 20 0C12 11-12 11-20 0Z" />
    <circle r={5} />
    {slash && <path d="M-16 14L16 -14" />}
  </>
);
const RadGlyph = () => (
  <>
    <circle r={3} />
    {[0, 120, 240].map((a) => (
      <path key={a} d="M5 -3L12 -15A18 18 0 0 1 19 -3Z" transform={`rotate(${a})`} />
    ))}
  </>
);
function Dove({ color }: { color: string }) {
  return (
    <path
      d="M-18 2C-10 -2 -6 -12 0 -14C2 -8 0 -4 -2 -1C4 -6 12 -8 20 -6C14 -2 8 4 0 6C-2 10 -8 12 -14 10L-10 6C-14 6 -16 4 -18 2Z"
      fill={color}
      stroke="none"
    />
  );
}
function XMark({ color, s = 26 }: { color: string; s?: number }) {
  return <path d={`M${-s} ${-s}L${s} ${s}M${s} ${-s}L${-s} ${s}`} stroke={color} strokeWidth={10} strokeLinecap="round" fill="none" />;
}

// ----------------------------------------------------------------------------
// Effects
// ----------------------------------------------------------------------------
const STOP = 0.6; // how far a failed effect gets

function Effect({ ctx, s, effect, ok }: { ctx: Ctx; s: Scene; effect: MapEffect; ok: boolean }) {
  const { A } = s;
  const B = s.B ?? lerp(A, [A[0] + 300, A[1] - 120], 1);
  const F = s.F ?? lerp(A, B, 0.6);
  const t0 = 0.35;

  switch (effect) {
    case 'deploy':
    case 'withdraw': {
      const out = effect === 'deploy';
      const front = shortOf(A, F, 46); // home side of the border
      const n = perp(A, front);
      const spread = 74;
      const color = ok ? C.home : C.fail;
      const units = [-1, 0, 1].map((k) => {
        const off: P = [n[0] * k * spread, n[1] * k * spread];
        const near: P = [A[0] + off[0] * 0.5, A[1] + off[1] * 0.5];
        const far: P = [front[0] + off[0], front[1] + off[1]];
        const [from, to0] = out ? [near, far] : [far, near];
        const to = ok ? to0 : lerp(from, to0, out ? 0.5 : 0.25);
        return { from, to, k };
      });
      return (
        <g>
          <DrawPath ctx={ctx} id="trail" d={`M${fmt(out ? A : front)}L${fmt(out ? front : A)}`} stroke={color} width={4} dash="4 16" begin={t0} dur={1.4} opacity={0.6} />
          {ok && out && (
            <FadeIn ctx={ctx} begin={t0 + 1.7}>
              <path
                d={`M${fmt([F[0] + n[0] * 150, F[1] + n[1] * 150])}L${fmt([F[0] - n[0] * 150, F[1] - n[1] * 150])}`}
                stroke={C.home}
                strokeWidth={6}
                strokeDasharray="18 10"
                opacity={0.85}
              />
            </FadeIn>
          )}
          {units.map((u) => (
            <Mover key={u.k} ctx={ctx} a={u.from} b={u.to} begin={t0 + 0.2 + Math.abs(u.k) * 0.18} dur={1.5} rotate={angle(u.from, u.to)}>
              <g opacity={ok ? 1 : 0.8}>
                <UnitGlyph color={color} />
              </g>
            </Mover>
          ))}
          {!ok && (
            <FadeIn ctx={ctx} begin={t0 + 1.8}>
              <g transform={`translate(${fmt(units[1].to)}) translate(0 -54)`}>
                <XMark color={C.failLine} s={12} />
              </g>
            </FadeIn>
          )}
        </g>
      );
    }

    case 'strike':
    case 'nuke': {
      const nuke = effect === 'nuke';
      const c = bowCtrl(A, B, nuke ? 0.32 : 0.26);
      const reach = ok ? 1 : STOP;
      const d = quadPath(A, c, B, reach);
      const hit = quadAt(A, c, B, reach);
      const color = !ok ? C.fail : nuke ? C.nuke : C.redLine;
      const fly = nuke ? 1.6 : 1.25;
      const motion = quadPath([0, 0], [c[0] - A[0], c[1] - A[1]], [B[0] - A[0], B[1] - A[1]], reach);
      return (
        <g>
          <DrawPath ctx={ctx} id="trail" d={d} stroke={color} width={nuke ? 7 : 5} dash={nuke ? undefined : '14 10'} begin={t0} dur={fly} opacity={0.85} />
          <g opacity={ctx.still ? 0 : 1}>
            <Mover ctx={ctx} a={A} b={hit} begin={t0} dur={fly} path={motion}>
              <g>
                {!ctx.still && <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.92;1" begin={`${t0}s`} dur={`${fly}s`} fill="freeze" />}
                <path d="M16 0L-10 -7L-6 0L-10 7Z" fill={color} />
                <circle cx={-14} r={5} fill={color} opacity={0.5} />
              </g>
            </Mover>
          </g>
          {ok ? (
            <g>
              {nuke && (
                <rect width={W} height={H} fill="#fff8d0" opacity={0}>
                  <Keys ctx={ctx} attr="opacity" values="0;0.55;0" begin={t0 + fly} dur={0.7} />
                </rect>
              )}
              <circle cx={hit[0]} cy={hit[1]} r={ctx.still ? (nuke ? 90 : 34) : 0} fill={nuke ? C.nuke : '#ffb199'} opacity={ctx.still ? 0.35 : 0.9}>
                <Anim ctx={ctx} attr="r" from={0} to={nuke ? 150 : 56} begin={t0 + fly} dur={0.5} />
                <Keys ctx={ctx} attr="opacity" values={nuke ? '0.95;0.6;0.35' : '0.9;0.4;0.25'} begin={t0 + fly} dur={1.2} />
              </circle>
              <Rings ctx={ctx} p={hit} color={nuke ? C.nuke : C.redLine} r0={20} r1={nuke ? 300 : 150} n={3} begin={t0 + fly} dur={nuke ? 1.6 : 1.1} repeat={nuke ? 2 : 3} width={nuke ? 8 : 5} />
              {nuke && (
                <FadeIn ctx={ctx} begin={t0 + fly + 0.4}>
                  <g transform={`translate(${fmt(hit)}) translate(0 -150)`}>
                    <Badge color={C.nuke} r={30}>
                      <RadGlyph />
                    </Badge>
                  </g>
                </FadeIn>
              )}
            </g>
          ) : (
            <FadeIn ctx={ctx} begin={t0 + fly - 0.1} to={0.85}>
              <circle cx={hit[0]} cy={hit[1]} r={26} fill="none" stroke={C.failLine} strokeWidth={4} strokeDasharray="6 8" />
              <g transform={`translate(${fmt(hit)})`}>
                <XMark color={C.failLine} s={11} />
              </g>
            </FadeIn>
          )}
        </g>
      );
    }

    case 'alliance':
    case 'court': {
      const alliance = effect === 'alliance';
      const color = ok ? (alliance ? C.blueLine : '#9cc8ff') : C.fail;
      const a = shortOf(B, A, 20);
      const b = shortOf(A, B, 20);
      const c = bowCtrl(a, b, 0.12);
      const mid = quadAt(a, c, b, 0.5);
      return (
        <g>
          {alliance ? (
            <>
              <DrawPath ctx={ctx} id="la" d={quadPath(a, c, b, ok ? 0.5 : 0.32)} stroke={color} width={7} begin={t0} dur={0.9} />
              <DrawPath ctx={ctx} id="lb" d={quadPath(b, c, a, ok ? 0.5 : 0.32)} stroke={color} width={7} begin={t0} dur={0.9} />
            </>
          ) : (
            <DrawPath ctx={ctx} id="l" d={quadPath(a, c, b, ok ? 1 : STOP)} stroke={color} width={5} dash="2 14" begin={t0} dur={1.2} />
          )}
          <FadeIn ctx={ctx} begin={t0 + (alliance ? 0.9 : 1.2)}>
            <g transform={`translate(${fmt(alliance ? mid : ok ? b : quadAt(a, c, b, STOP))})`}>
              <g>
                {!ctx.still && (
                  <animateTransform attributeName="transform" type="scale" values="0.3;1.15;1" begin={`${t0 + (alliance ? 0.9 : 1.2)}s`} dur="0.45s" fill="freeze" />
                )}
                <Badge color={color} r={alliance ? 38 : 32}>
                  {alliance ? <LinkGlyph /> : <HeartGlyph />}
                  {!ok && <path d="M-26 26L26 -26" stroke={C.failLine} />}
                </Badge>
              </g>
            </g>
          </FadeIn>
          {ok && <Rings ctx={ctx} p={alliance ? mid : b} color={color} r0={40} r1={alliance ? 140 : 100} n={2} begin={t0 + 1.3} dur={1.3} repeat={2} width={4} />}
        </g>
      );
    }

    case 'denounce': {
      const color = ok ? C.redLine : C.fail;
      const dir = angle(A, B);
      const reach = ok ? 1 : 0.5;
      const end = shortOf(A, B, 60);
      return (
        <g>
          {[0, 1, 2].map((i) => {
            const from = shortOf(B, A, dist(A, B) - 40);
            const to = lerp(from, end, reach);
            return (
              <Mover key={i} ctx={ctx} a={from} b={to} begin={t0 + i * 0.25} dur={1.2} rotate={dir}>
                <g opacity={ctx.still ? (ok ? 0.25 + i * 0.2 : 0.4) : 1}>
                  {!ctx.still && <animate attributeName="opacity" values="0;1;0.2" begin={`${t0 + i * 0.25}s`} dur="1.2s" fill="freeze" />}
                  <path d="M0 -34A40 40 0 0 1 0 34" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
                </g>
              </Mover>
            );
          })}
          <FadeIn ctx={ctx} begin={t0 + 1.2} to={ok ? 1 : 0.5}>
            <g transform={`translate(${fmt(B)})`}>
              <g>
                {!ctx.still && ok && (
                  <animateTransform attributeName="transform" type="scale" values="1.6;0.9;1.05;1;1.05;1" begin={`${t0 + 1.2}s`} dur="1.6s" fill="freeze" />
                )}
                <XMark color={ok ? C.red : C.fail} s={40} />
              </g>
            </g>
          </FadeIn>
          {ok && <Rings ctx={ctx} p={B} color={C.red} r0={40} r1={130} n={2} begin={t0 + 1.3} dur={1} repeat={2} width={5} />}
        </g>
      );
    }

    case 'covert': {
      const color = ok ? C.intel : C.fail;
      const c = bowCtrl(A, B, -0.1);
      const reach = ok ? 1 : STOP;
      const end = quadAt(A, c, B, reach);
      return (
        <g>
          <DrawPath ctx={ctx} id="dots" d={quadPath(A, c, B, reach)} stroke={color} width={6} dash="0.1 18" begin={t0} dur={1.6} />
          <FadeIn ctx={ctx} begin={t0 + 1.5}>
            <g transform={`translate(${fmt(end)}) translate(0 -58)`}>
              <g>
                {!ctx.still && ok && (
                  <animateTransform attributeName="transform" type="scale" values="1 1;1 0.1;1 1" begin={`${t0 + 2.2}s`} dur="0.3s" repeatCount="2" />
                )}
                <Badge color={color} r={34}>
                  <EyeGlyph slash={!ok} />
                </Badge>
              </g>
            </g>
          </FadeIn>
          {ok && <Rings ctx={ctx} p={B} color={C.intel} r0={24} r1={90} n={2} begin={t0 + 1.6} dur={1.4} repeat={2} width={3} />}
        </g>
      );
    }

    case 'ceasefire': {
      const color = ok ? C.white : C.fail;
      const n = perp(A, B);
      const across = (k: number): string => {
        const L = dist(A, B) || 1;
        const t: P = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
        const p0: P = [F[0] + n[0] * 130 + t[0] * k, F[1] + n[1] * 130 + t[1] * k];
        const p1: P = [F[0] - n[0] * 130 + t[0] * k, F[1] - n[1] * 130 + t[1] * k];
        return `M${fmt(p0)}L${fmt(p1)}`;
      };
      return (
        <g>
          <DrawPath ctx={ctx} id="w1" d={across(-14)} stroke={color} width={6} begin={t0} dur={0.7} opacity={0.9} />
          <DrawPath ctx={ctx} id="w2" d={across(14)} stroke={color} width={6} begin={t0 + 0.2} dur={0.7} opacity={0.9} />
          {[-1, 0, 1].map((k) => {
            const from: P = [F[0] + k * 50, F[1] - 10];
            const to: P = ok ? [F[0] + k * 120, F[1] - 190 + Math.abs(k) * 30] : [F[0] + k * 40, F[1] + 40];
            return (
              <Mover key={k} ctx={ctx} a={from} b={to} begin={t0 + 0.8 + (k + 1) * 0.15} dur={1.6}>
                <g opacity={ok ? 0.95 : 0.55} transform={`scale(${k === 0 ? 1.8 : 1.4})${k < 0 ? ' scale(-1 1)' : ''}`}>
                  <Dove color={color} />
                </g>
              </Mover>
            );
          })}
        </g>
      );
    }

    case 'war': {
      const ca = ok ? C.home : C.fail;
      const cb = ok ? C.red : C.fail;
      const n = perp(A, B);
      const stopA = ok ? shortOf(A, F, 30) : lerp(A, F, 0.55);
      const stopB = ok ? shortOf(B, F, 30) : lerp(B, F, 0.55);
      const jag = Array.from({ length: 9 }, (_, i) => {
        const k = (i - 4) * 32;
        const j = i % 2 === 0 ? 12 : -12;
        const L = dist(A, B) || 1;
        return fmt([F[0] + n[0] * k + ((B[0] - A[0]) / L) * j, F[1] + n[1] * k + ((B[1] - A[1]) / L) * j]);
      }).join('L');
      return (
        <g>
          <DrawPath ctx={ctx} id="wa" d={`M${fmt(A)}L${fmt(stopA)}`} stroke={ca} width={12} begin={t0} dur={1.1} cap="butt" opacity={0.9} />
          <DrawPath ctx={ctx} id="wb" d={`M${fmt(B)}L${fmt(stopB)}`} stroke={cb} width={12} begin={t0} dur={1.1} cap="butt" opacity={0.9} />
          <FadeIn ctx={ctx} begin={t0 + 1}>
            <g transform={`translate(${fmt(stopA)}) rotate(${angle(A, F).toFixed(1)})`}>
              <path d="M18 0L-14 -20L-14 20Z" fill={ca} />
            </g>
            <g transform={`translate(${fmt(stopB)}) rotate(${angle(B, F).toFixed(1)})`}>
              <path d="M18 0L-14 -20L-14 20Z" fill={cb} />
            </g>
          </FadeIn>
          {ok && (
            <>
              <FadeIn ctx={ctx} begin={t0 + 1.1}>
                <path d={`M${jag}`} fill="none" stroke="#ff9b8a" strokeWidth={5} strokeLinejoin="round">
                  <Keys ctx={ctx} attr="opacity" values="1;0.35;1;0.6;1" begin={t0 + 1.1} dur={0.9} repeat="indefinite" />
                </path>
              </FadeIn>
              <Rings ctx={ctx} p={F} color="#ffb199" r0={14} r1={90} n={3} begin={t0 + 1.1} dur={0.9} repeat="indefinite" width={4} />
            </>
          )}
        </g>
      );
    }

    default:
      return <Rings ctx={ctx} p={A} color={C.homeLine} r0={30} r1={140} n={2} begin={t0} dur={1.8} repeat="indefinite" width={4} />;
  }
}

function targetColors(effect: MapEffect, ok: boolean): [string, string] {
  if (HOSTILE.has(effect)) return ok ? [C.red, C.redLine] : ['#6d3436', '#a25a55'];
  if (FRIENDLY.has(effect)) return ok ? [C.blue, C.blueLine] : ['#2f4a72', '#5e7ca6'];
  return ['#3a4a63', '#6c7d98'];
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}

/** The outcome reel's geographic visual: home in amber, target in red or blue, effect animated. */
export function OutcomeMap({ home, target, effect, ok, label }: OutcomeMapProps): JSX.Element {
  const raw = useId();
  const uid = `om${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [geo, setGeo] = useState<WorldGeo | null>(() => worldIfLoaded());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (geo) return;
    let live = true;
    loadWorld()
      .then((g) => live && setGeo(g))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [geo]);
  const scene = useMemo(() => (geo ? buildScene(geo, home, target) : null), [geo, home, target]);
  const [reduced] = useState(prefersReducedMotion);
  const ctx: Ctx = { still: reduced, uid };
  const [tFill, tLine] = targetColors(effect, ok);
  const hasTarget = !!scene?.B;

  return (
    <div className={`outcome-map ${ok ? 'ok' : 'failed'}`} role="img" aria-label={label ?? `${home}${target ? ` and ${target}` : ''}: ${effect}${ok ? '' : ' (failed)'}`}>
      {scene ? (
        <svg key={`${home}-${target ?? ''}-${effect}-${ok ? 1 : 0}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <radialGradient id={`${uid}-sea`} cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor={C.ocean} />
              <stop offset="100%" stopColor={C.oceanEdge} />
            </radialGradient>
            <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
            <radialGradient id={`${uid}-vig`} cx="50%" cy="50%" r="70%">
              <stop offset="60%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${uid}-sea)`} />
          <path d={scene.grid} stroke={C.grid} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" />
          <path d={scene.land} fill={C.land} stroke={C.landLine} strokeWidth={0.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {/* Glows under the two countries */}
          <path d={scene.home} fill="none" stroke={C.home} strokeWidth={18} opacity={0.35} filter={`url(#${uid}-glow)`} />
          {hasTarget && <path d={scene.target} fill="none" stroke={tFill} strokeWidth={18} opacity={0.35} filter={`url(#${uid}-glow)`} />}
          <path d={scene.home} fill={C.home} fillOpacity={0.88} stroke={C.homeLine} strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {hasTarget && (
            <path d={scene.target} fill={tFill} fillOpacity={0.82} stroke={tLine} strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round">
              {!reduced && ok && HOSTILE.has(effect) && (
                <animate attributeName="fill-opacity" values="0.82;0.55;0.82" begin="1.7s" dur="1.4s" repeatCount="2" />
              )}
            </path>
          )}
          <circle cx={scene.A[0]} cy={scene.A[1]} r={7} fill="#fff" stroke={C.dark} strokeWidth={3} />
          {scene.B && <circle cx={scene.B[0]} cy={scene.B[1]} r={7} fill="#fff" stroke={C.dark} strokeWidth={3} />}
          <Effect ctx={ctx} s={scene} effect={effect} ok={ok} />
          <rect width={W} height={H} fill={`url(#${uid}-vig)`} pointerEvents="none" />
        </svg>
      ) : (
        <div className="om-loading">{failed ? 'Map unavailable' : ''}</div>
      )}
      {scene && (
        <>
          <span className="om-name home" style={nameStyle(scene.A, scene.B)}>
            {scene.homeName}
          </span>
          {scene.B && (
            <span className="om-name target" style={nameStyle(scene.B, scene.A)}>
              {scene.targetName}
            </span>
          )}
        </>
      )}
      {label && <div className={`om-label ${ok ? '' : 'failed'}`}>{label}</div>}
    </div>
  );
}

/** Country name beside its anchor, on the side away from the other country. */
function nameStyle(p: P, other: P | null): CSSProperties {
  const below = !other || other[1] < p[1] - 40;
  const left = `${Math.max(6, Math.min(94, (p[0] / W) * 100))}%`;
  const top = `${Math.max(5, Math.min(92, (p[1] / H) * 100))}%`;
  return { left, top, transform: `translate(-50%, ${below ? '45%' : '-145%'})` };
}
