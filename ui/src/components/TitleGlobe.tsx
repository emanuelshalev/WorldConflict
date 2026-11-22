import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { featureId, labelPoint, loadWorld, type WorldGeo } from '../scenes/worldGeo';
import { type GlobeFitState, PHONE_MAX, measureDiameter, titleInsets, useGlobeFit } from '../lib/globeFit';
import {
  FONT_ITALIC,
  FONT_REGULAR,
  FONT_SEMIBOLD,
  GLYPHS_URL,
  type LabelFeature,
  type LabelOptions,
  labelFeatures,
  labelFilter,
} from '../lib/mapLabels';
import { isIdle, onIdleChange, useIdle } from '../lib/motion';
import { iconSvg } from '../lib/iconSvg';
import { sound } from '../lib/sound';
import { SITUATION_KINDS, situationKindOf } from '../lib/crisisKind';
import type { EraMap, LngLat } from '../store/gameStore';
import { RESERVE_IMAGE, RESERVE_IMAGE_SIZE } from './mapMarkers';
import {
  type ColourBy,
  type Density,
  angularDistance,
  clusterPins,
  countryTip,
  eraFills,
  eraLines,
  eraNames,
  eraPins,
  eraStatusLabels,
  fanOffsets,
  isFarSide,
  rimPoint,
} from './globe/eraLayers';

export interface GlobePin {
  id: string;
  at: [number, number];
  label: string;
  gold?: boolean;
  /** Pin colour and the icon's static SVG markup (crisis kind). */
  color?: string;
  iconSvg?: string;
  /** Shown on hover: the crisis line and the sides' flags. */
  sub?: string;
  /** Era situations: the number of one of the era's five fires. */
  num?: number;
  /** Era situations: brewing (hollow, dashed ring) or frozen (faded). */
  phase?: 'ACTIVE' | 'BREWING' | 'FROZEN';
  /** A hot zone (Gaza, West Bank): a smaller pin that opens no card. */
  zone?: boolean;
}

export interface GlobeArc {
  from: [number, number];
  to: [number, number];
  color: string;
  on?: boolean;
  /** front: solid war line; rival and blockade: dotted. Default rival. */
  style?: 'front' | 'rival' | 'blockade';
}

interface Props {
  pins: GlobePin[];
  selectedPin: string | null;
  onPin: (id: string) => void;
  /** Countries tinted on the globe (playable nations, or the selected crisis's sides). */
  tint: Record<string, string>;
  selectedCountry?: string;
  onCountry?: (id: string) => void;
  focus: [number, number] | null;
  /** Width of the dossier on the right: the globe fits in the space left of it. */
  padRight: number;
  arcs?: GlobeArc[];
  /**
   * Label inputs (era names, era status, sides...). Optional: by default the roster is labelled
   * with game names, the selected country is tier 0, and so are the tinted countries when the tint
   * marks a crisis's sides (a handful) rather than every playable nation.
   */
  labels?: LabelOptions;
  /**
   * The era's world (One Term and Legacy): when set, the globe draws the era instead of `pins`,
   * `arcs` and `tint`: its colours, situations, fronts and names (design-worldmap.md 3.3).
   */
  era?: EraMap | null;
  colourBy?: ColourBy;
  density?: Density;
  selectedSituation?: string | null;
  onSituation?: (id: string) => void;
  /** CSS selector of page elements over the globe: names under them are dropped. */
  obstacles?: string;
}

/** The pin element is 30 px square (title.css .tg-pin): one reserve icon of that size per pin. */
const PIN_PX = 30;
/** Spin speed: degrees of longitude per second, stepped at about 30 fps. */
const SPIN_DEG_S = 1.8;
const SPIN_STEP_MS = 33;
/** Phones stop turning after 8 s (battery). */
const PHONE_SPIN_MS = 8000;
/** Time travel (3.4): camera 900 ms; the fills swap behind a veil at 320 ms; pins land from 600 ms. */
const TRAVEL_MS = 900;
const SWAP_MS = 320;
const DROP_AT = 600;
const DROP_MS = 180;
/** Reduced motion: a 150 ms cross-fade, nothing moves. */
const REDUCED_MS = 150;
/** Archive ink over the older eras (a static CSS vignette). */
const ERA_INK: Record<string, number> = { '1960': 0.75, '1990': 0.35 };
const LINE_COLOR = { front: '#ff4d4f', rival: '#f26b3a', blockade: '#36c5f0' } as const;

/** A curved line between two points (a raised midpoint), so rival lines read as arcs on the globe. */
function arcLine(a: [number, number], b: [number, number], steps = 32): [number, number][] {
  let dl = b[0] - a[0];
  if (dl > 180) dl -= 360;
  if (dl < -180) dl += 360;
  const lift = Math.min(18, Math.hypot(dl, b[1] - a[1]) * 0.25);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [a[0] + dl * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * lift] as [number, number];
  });
}

const isPhone = () => window.innerWidth <= PHONE_MAX;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Text width cache for the label obstacle test (canvas measureText, one per name and size). */
const widthCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, size: number): number {
  const key = `${size}|${text}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  let w = text.length * size * 0.58;
  if (measureCtx) {
    measureCtx.font = `600 ${size}px "Open Sans", Arial, sans-serif`;
    w = measureCtx.measureText(text).width * 1.04;
  }
  widthCache.set(key, w);
  return w;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
const hit = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * The title screen's world: a globe that fits the free part of the screen, names on its countries
 * and a pin on every live crisis, or the world of the chosen era (One Term, Legacy). It turns
 * slowly for the first seconds, then holds still: hover, touch, a pick, an idle page, a hidden tab
 * or reduced motion stop it. Pick a pin or a country and the camera turns there; pick another era
 * and the globe travels in time (900 ms, or a 150 ms fade with reduced motion).
 */
export function TitleGlobe(props: Props) {
  const { selectedCountry, onCountry, focus, padRight, labels, era = null, colourBy = 'blocs', density = 'calm', selectedSituation = null } = props;
  const box = useRef<HTMLDivElement>(null);
  const rimBox = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLButtonElement; pin: GlobePin }>());
  const rims = useRef(new Map<string, HTMLButtonElement>());
  const [ready, setReady] = useState(false);
  const [geo, setGeo] = useState<WorldGeo | null>(null);
  const [shapes, setShapes] = useState<Set<string> | null>(null);
  const [fitTarget, setFitTarget] = useState<{ map: maplibregl.Map; el: HTMLElement } | null>(null);
  // A fanned-out cluster, valid for one era, switch position and pick (a new one folds it back)
  const [fanState, setFanned] = useState<{ key: string; id: string } | null>(null);
  const fanKey = useRef('');
  // No WebGL (old devices, some locked-down browsers): a painted backdrop instead of the globe
  const [failed] = useState(() => {
    try {
      return !document.createElement('canvas').getContext('webgl2') && !document.createElement('canvas').getContext('webgl');
    } catch {
      return true;
    }
  });
  const hold = useRef(0); // time until which the spin stays paused (Infinity after a pick)
  const kick = useRef<() => void>(() => undefined); // restarts the spin loop when it may run again
  const layout = useRef<() => void>(() => undefined); // re-places rim markers, clusters, cards
  const eraRef = useRef<EraMap | null>(era);
  const obstacleSel = useRef('[data-globe-obstacle]');
  const fannedRef = useRef<string | null>(null);
  const handlers = useRef({ onPin: props.onPin, onCountry, onSituation: props.onSituation });
  useEffect(() => {
    handlers.current = { onPin: props.onPin, onCountry, onSituation: props.onSituation };
    eraRef.current = era;
    obstacleSel.current = props.obstacles ?? '[data-globe-obstacle]';
  });
  useIdle();
  const phone = isPhone();

  // ---------------------------------------------------------------------------------------------
  // What to draw: the era's world, or the flashpoints (props)
  // ---------------------------------------------------------------------------------------------
  const at = useCallback((id: string): LngLat | null => (geo ? labelPoint(geo, id) : null), [geo]);
  const pins: GlobePin[] = useMemo(() => {
    if (!era) return props.pins;
    const list: GlobePin[] = eraPins(era, density).map((p) => {
      const k = SITUATION_KINDS[situationKindOf(p.situation.kind)];
      const phase = p.situation.phase;
      return {
        id: `${era.scenarioId}:${p.id}`,
        at: p.situation.at,
        label: p.situation.title,
        color: k.color,
        iconSvg: iconSvg(k.icon, k.ink ?? '#fff'),
        sub: `${k.label}${phase === 'BREWING' ? ' · brewing' : phase === 'FROZEN' ? ' · frozen' : ''}${p.situation.since ? ` · since ${p.situation.since.slice(0, 4)}` : ''}`,
        num: p.num,
        phase,
      };
    });
    if (density === 'all') {
      for (const h of era.hotspots) {
        list.push({ id: `${era.scenarioId}:hot:${h.id}`, at: h.center, label: h.name, color: '#ff8a3d', iconSvg: iconSvg(SITUATION_KINDS.WAR.icon), sub: 'Hot zone: not a state', zone: true });
      }
    }
    return list;
  }, [era, density, props.pins]);
  const selectedPin = era ? (selectedSituation ? `${era.scenarioId}:${selectedSituation}` : null) : props.selectedPin;
  const arcs: GlobeArc[] = useMemo(() => {
    if (!era) return props.arcs ?? [];
    return eraLines(era, density, selectedSituation, at).map((l) => ({ from: l.from, to: l.to, color: LINE_COLOR[l.style], on: l.on, style: l.style }));
  }, [era, density, selectedSituation, at, props.arcs]);
  const fills = useMemo(
    () => (era ? eraFills(era, colourBy, props.tint) : { fill: props.tint, outline: {} as Record<string, string>, merged: {} as Record<string, string> }),
    [era, colourBy, props.tint],
  );
  // Chips: every era pin carries its name on desktop with the switch on (variant A)
  const chips = !!era && density === 'all' && !phone;

  // ---------------------------------------------------------------------------------------------
  // Map bootstrap
  // ---------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!box.current || failed) return;
    const el = box.current;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: el,
        style: {
          version: 8,
          // Self-hosted Latin glyphs (ui/public/glyphs): no external font server at runtime
          glyphs: `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}${GLYPHS_URL.replace(/^\//, '')}`,
          sources: {},
          layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#0a1628' } }],
          projection: { type: 'globe' },
          sky: {
            'sky-color': '#05080f',
            'horizon-color': '#2a5aa8',
            'fog-color': '#05080f',
            'sky-horizon-blend': 0.7,
            'horizon-fog-blend': 0.8,
            'fog-ground-blend': 0.9,
            'atmosphere-blend': 1,
          },
        },
        center: [30, 22],
        zoom: 1.4, // replaced by the fit (globeFit.ts) before the first visible frame matters
        minZoom: 0,
        maxZoom: 5,
        fadeDuration: 150,
        attributionControl: false,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      return;
    }
    mapRef.current = map;
    // Dev and QA hook (worldmap QA scenario measures the fit and the labels through it)
    if (import.meta.env.DEV) (window as unknown as { __wcTitleMap?: maplibregl.Map }).__wcTitleMap = map;
    map.on('error', () => undefined);
    const reduced = reducedMotion();
    const born = performance.now();

    map.on('load', async () => {
      const world = await loadWorld().catch(() => null);
      if (!world) return;
      const withId = { ...world, features: world.features.map((f) => ({ ...f, properties: { ...f.properties, gid: featureId(f) } })) };
      map.addSource('land', { type: 'geojson', data: withId, promoteId: 'gid' });
      map.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': ['coalesce', ['feature-state', 'tint'], '#18233a'], 'fill-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 0.95, 0.85] } });
      // Borders: a polygon merged into its parent (the Soviet republics) gets a hairline in the
      // parent's colour, so the union reads as one country
      map.addLayer({
        id: 'land-line',
        type: 'line',
        source: 'land',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#ffd08a', ['coalesce', ['feature-state', 'merged'], '#0a1628']],
          'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2, 0.6],
        },
      });
      // Bloc outlines (Stability colouring keeps the camps visible)
      map.addLayer({
        id: 'era-outline',
        type: 'line',
        source: 'land',
        paint: { 'line-color': ['coalesce', ['feature-state', 'outline'], 'rgba(0,0,0,0)'], 'line-width': 1.3, 'line-opacity': 0.9 },
      });
      // Era shapes Natural Earth does not have (East Germany, South Yemen): optional static file
      fetch(`${import.meta.env.BASE_URL ?? '/'}era/shapes.geojson`)
        .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : null))
        .then((fc: GeoJSON.FeatureCollection | null) => {
          if (!fc?.features?.length || !map.getLayer('land-line')) return;
          const feats = fc.features.map((f) => ({ ...f, properties: { ...f.properties, sid: String((f.properties as Record<string, unknown>)?.id ?? (f.properties as Record<string, unknown>)?.ADM0_A3 ?? '') } }));
          map.addSource('era-shapes', { type: 'geojson', data: { type: 'FeatureCollection', features: feats }, promoteId: 'sid' });
          map.addLayer({ id: 'era-shapes', type: 'fill', source: 'era-shapes', paint: { 'fill-color': ['coalesce', ['feature-state', 'tint'], 'rgba(0,0,0,0)'], 'fill-opacity': 0.92 } }, 'land-line');
          map.addLayer({ id: 'era-shapes-line', type: 'line', source: 'era-shapes', paint: { 'line-color': ['case', ['boolean', ['feature-state', 'on'], false], '#0a1628', 'rgba(0,0,0,0)'], 'line-width': 0.8 } }, 'era-outline');
          setShapes(new Set(feats.map((f) => f.properties.sid)));
        })
        .catch(() => undefined);
      // The veil: a flat land colour faded over the fills while the era's colours swap (fill
      // colours set by feature state cannot transition themselves; an opacity can, on the GPU)
      map.addLayer({ id: 'land-veil', type: 'fill', source: 'land', paint: { 'fill-color': '#18233a', 'fill-opacity': 0, 'fill-opacity-transition': { duration: 200, delay: 0 } } });
      map.addSource('arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'arcs-glow', type: 'line', source: 'arcs', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['==', ['get', 'style'], 'front'], 8, ['get', 'on'], 7, 4], 'line-opacity': ['case', ['==', ['get', 'style'], 'front'], 0.3, 0.18], 'line-blur': 4 } });
      map.addLayer({ id: 'fronts', type: 'line', source: 'arcs', filter: ['==', ['get', 'style'], 'front'], layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'on'], 3.2, 2.6] } });
      map.addLayer({ id: 'arcs', type: 'line', source: 'arcs', filter: ['!=', ['get', 'style'], 'front'], layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'on'], 2.4, 1.4], 'line-opacity': ['case', ['get', 'on'], 1, 0.7], 'line-dasharray': [0, 2, 3] } });
      // Country names: one symbol layer, written once per input change (never per frame)
      map.addSource('labels', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'labels',
        type: 'symbol',
        source: 'labels',
        filter: ['<=', ['get', 'tier'], 2],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['case', ['get', 'italic'], ['literal', FONT_ITALIC], ['get', 'muted'], ['literal', FONT_REGULAR], ['literal', FONT_SEMIBOLD]],
          'text-size': ['get', 'size'],
          'symbol-sort-key': ['get', 'sort'],
          'text-allow-overlap': false,
          // Vertical moves only: a name stays over its country and the page's panels can be kept
          // clear of it exactly (layout below)
          'text-variable-anchor': ['center', 'top', 'bottom'],
          'text-radial-offset': 0.9,
          'text-padding': 3,
          'text-max-width': 7,
          'text-pitch-alignment': 'viewport',
        },
        paint: {
          'text-color': ['case', ['get', 'muted'], '#a9b4c4', '#e8ecf2'],
          'text-halo-color': '#05080f',
          'text-halo-width': 1.6,
          'text-halo-blur': 0.4,
          'text-opacity': 1,
          'text-opacity-transition': { duration: 150, delay: 0 },
        },
      });
      // Invisible footprints of the DOM pins (and their name chips), above the labels so they are
      // placed first and names move to a free side or drop out instead of printing over a pin
      // (design-feel 8.3)
      map.addImage(RESERVE_IMAGE, { width: RESERVE_IMAGE_SIZE, height: RESERVE_IMAGE_SIZE, data: new Uint8Array(RESERVE_IMAGE_SIZE * RESERVE_IMAGE_SIZE * 4) });
      map.addSource('pin-reserve', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'pin-reserve',
        type: 'symbol',
        source: 'pin-reserve',
        layout: { 'icon-image': RESERVE_IMAGE, 'icon-size': ['get', 'size'], 'icon-offset': ['get', 'offset'], 'icon-allow-overlap': true, 'icon-ignore-placement': false },
        paint: { 'icon-opacity': 0 },
      });
      let longPressed = false;
      map.on('click', 'land', (e) => {
        if (longPressed) {
          longPressed = false;
          return;
        }
        const id = e.features?.[0]?.properties?.gid as string | undefined;
        if (id) handlers.current.onCountry?.(id);
      });
      // Hover card (desktop) and long-press (touch): era name, leader, stability, camp, rivals
      const tip = tipRef.current;
      const showTip = (gid: string, name: string, x: number, y: number) => {
        const e = eraRef.current;
        if (!tip || !e) return;
        const t = countryTip(e, gid, name);
        if (!t) return hideTip();
        tip.replaceChildren();
        const b = document.createElement('b');
        b.textContent = t.title;
        tip.append(b);
        for (const line of t.lines) {
          const s = document.createElement('span');
          s.textContent = line;
          tip.append(s);
        }
        tip.dataset.country = gid;
        tip.hidden = false;
        const W = el.clientWidth;
        const w = tip.offsetWidth;
        const h = tip.offsetHeight;
        const left = x + 16 + w > W - (map.getPadding().right ?? 0) ? x - 16 - w : x + 16;
        tip.style.transform = `translate(${Math.max(8, Math.round(left))}px, ${Math.max(8, Math.round(y - h - 12))}px)`;
      };
      const hideTip = () => {
        if (tip) tip.hidden = true;
      };
      map.on('mousemove', 'land', (e) => {
        map.getCanvas().style.cursor = handlers.current.onCountry ? 'pointer' : '';
        const f = e.features?.[0];
        const gid = f?.properties?.gid as string | undefined;
        if (gid && eraRef.current && (e.originalEvent as PointerEvent).pointerType !== 'touch') showTip(gid, String(f?.properties?.NAME ?? gid), e.point.x, e.point.y);
      });
      map.on('mouseleave', 'land', hideTip);
      let press: ReturnType<typeof setTimeout> | undefined;
      let pressAt: [number, number] = [0, 0];
      const down = (ev: PointerEvent) => {
        if (ev.pointerType !== 'touch' || !eraRef.current) return;
        const r = el.getBoundingClientRect();
        pressAt = [ev.clientX - r.left, ev.clientY - r.top];
        clearTimeout(press);
        press = setTimeout(() => {
          const f = map.queryRenderedFeatures(pressAt, { layers: ['land'] })[0];
          const gid = f?.properties?.gid as string | undefined;
          if (gid) {
            longPressed = true;
            showTip(gid, String(f?.properties?.NAME ?? gid), pressAt[0], pressAt[1]);
          }
        }, 480);
      };
      const cancelPress = (ev: PointerEvent) => {
        if (ev.type === 'pointermove') {
          const r = el.getBoundingClientRect();
          if (Math.hypot(ev.clientX - r.left - pressAt[0], ev.clientY - r.top - pressAt[1]) < 8) return;
        }
        clearTimeout(press);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', cancelPress);
      el.addEventListener('pointermove', cancelPress);
      el.addEventListener('pointercancel', cancelPress);
      map.on('movestart', (e) => {
        if ((e as { originalEvent?: unknown }).originalEvent) hideTip();
      });
      setGeo(world);
      setFitTarget({ map, el });
      setReady(true);
    });

    // Spin: a loop that exists only while the globe may turn, so an idle title costs no frames
    let hovered = false;
    let raf = 0;
    let last = 0;
    let dashStep = -1;
    const dashes = [
      [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
      [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
    ];
    const mayTurn = (t: number) =>
      !reduced &&
      !hovered &&
      !isIdle() &&
      document.visibilityState !== 'hidden' &&
      t >= hold.current &&
      !(isPhone() && t - born > PHONE_SPIN_MS);
    const frame = (t: number) => {
      raf = 0;
      if (!mayTurn(t)) return; // stop: kick() restarts when a condition clears
      raf = requestAnimationFrame(frame);
      if (t - last < SPIN_STEP_MS || map.isMoving()) return;
      const dt = last ? Math.min(100, t - last) : SPIN_STEP_MS;
      last = t;
      // Marching dashes on the rival lines move with the spin and stop with it
      const s2 = Math.floor(t / 110) % dashes.length;
      if (s2 !== dashStep && map.getLayer('arcs')) {
        dashStep = s2;
        map.setPaintProperty('arcs', 'line-dasharray', dashes[s2]);
      }
      const c = map.getCenter();
      map.setCenter([c.lng + (SPIN_DEG_S * dt) / 1000, c.lat]);
    };
    const start = () => {
      if (raf || !mayTurn(performance.now())) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    kick.current = start;
    const enter = () => {
      hovered = true;
    };
    const leave = () => {
      hovered = false;
      if (tipRef.current) tipRef.current.hidden = true;
      start();
    };
    const touch = () => {
      hold.current = Math.max(hold.current, performance.now() + 6000);
      window.setTimeout(start, 6100);
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', touch);
    const offIdle = onIdleChange((idle) => {
      if (!idle) start();
    });
    document.addEventListener('visibilitychange', start);
    start();
    const pinsLive = markers.current;
    return () => {
      cancelAnimationFrame(raf);
      offIdle();
      document.removeEventListener('visibilitychange', start);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', touch);
      kick.current = () => undefined;
      setFitTarget(null);
      for (const p of pinsLive.values()) p.m.remove();
      pinsLive.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [failed]);

  // ---------------------------------------------------------------------------------------------
  // Fit: the globe fills the free part of the screen, on load and on every resize
  // ---------------------------------------------------------------------------------------------
  const framed = useRef<number | null>(null); // zoom offset from the fit while a pick is framed
  const tierFilter = useRef<unknown[]>(['<=', ['get', 'tier'], 2]);
  const hiddenLabels = useRef<string[]>([]);
  const applyLabelFilter = useCallback((map: maplibregl.Map) => {
    if (!map.getLayer('labels')) return;
    const f = hiddenLabels.current.length ? ['all', tierFilter.current, ['!', ['in', ['get', 'id'], ['literal', hiddenLabels.current]]]] : tierFilter.current;
    map.setFilter('labels', f as maplibregl.FilterSpecification);
  }, []);
  const updateTiers = useCallback(
    (map: maplibregl.Map, fit: number) => {
      if (!map.getLayer('labels') || !Number.isFinite(fit)) return;
      tierFilter.current = labelFilter(map.getZoom(), fit, isPhone());
      applyLabelFilter(map);
    },
    [applyLabelFilter],
  );
  const fitter = useGlobeFit(
    fitTarget?.map ?? null,
    fitTarget?.el ?? null,
    (w, h) => titleInsets(w, h, padRight),
    (fit: number, s: GlobeFitState) => {
      const map = mapRef.current;
      if (!map) return;
      if (framed.current !== null && !s.userZoomed) map.jumpTo({ zoom: fit + framed.current });
      updateTiers(map, fit);
      layout.current();
    },
  );
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const on = () => updateTiers(map, fitter.fit());
    map.on('zoomend', on);
    return () => {
      map.off('zoomend', on);
    };
  }, [ready, fitter, updateTiers]);

  /**
   * Narrow desktops (no left inset, 901 to 1279 px): the copy column covers the globe's left side.
   * Returns how far right (px) a framed place should sit so it lands between the copy and the
   * dossier; 0 elsewhere.
   */
  const coverOffset = useCallback((map: maplibregl.Map): number => {
    const W = window.innerWidth;
    if (W <= PHONE_MAX || W >= 1280) return 0;
    const el = map.getContainer();
    const host = el.getBoundingClientRect();
    const pad = map.getPadding();
    const freeL = pad.left ?? 0;
    const freeR = el.clientWidth - (pad.right ?? 0);
    const midY = (pad.top ?? 0) + (el.clientHeight - (pad.top ?? 0) - (pad.bottom ?? 0)) / 2;
    const band = measureDiameter(map) / 4;
    let right = 0;
    for (const o of document.querySelectorAll<HTMLElement>(obstacleSel.current)) {
      const r = o.getBoundingClientRect();
      if (r.width < 1 || r.left - host.left > 120) continue;
      if (r.bottom - host.top < midY - band || r.top - host.top > midY + band) continue;
      right = Math.max(right, r.right - host.left);
    }
    if (right <= freeL) return 0;
    return Math.max(0, Math.round((right + freeR) / 2 - (freeL + freeR) / 2));
  }, []);

  // ---------------------------------------------------------------------------------------------
  // Time travel (3.4): one transition at a time, a new era retargets from the current frame
  // ---------------------------------------------------------------------------------------------
  const travel = useRef<{ start: number; reduced: boolean; timers: number[] } | null>(null);
  const prevEra = useRef<string | null>(null);
  const eraId = era?.scenarioId ?? null;
  const eraYear = era?.year ?? null;
  const eraFocusKey = era ? `${era.focus[0]},${era.focus[1]}` : '';
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const prev = prevEra.current;
    prevEra.current = eraId;
    if (!eraId || eraId === prev) return;
    const reduced = reducedMotion();
    for (const t of travel.current?.timers ?? []) window.clearTimeout(t);
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    travel.current = { start: performance.now(), reduced, timers };
    // Done when the last pin has landed: 600 + up to 120 of stagger + 180 = 900 ms (the click and
    // the render before this effect add a few tens of ms: still inside the 1000 ms budget)
    later(reduced ? REDUCED_MS : DROP_AT + 120 + DROP_MS, () => {
      travel.current = null;
    });
    const [focusLng, lat] = eraFocusKey.split(',').map(Number);
    // Narrow desktops: turn the focus out from under the copy column
    const dx = coverOffset(map);
    const R = measureDiameter(map) / 2;
    const lng = dx > 0 && R > 0 ? focusLng - (Math.asin(Math.min(0.35, dx / R)) * 180) / Math.PI : focusLng;
    hold.current = Math.max(hold.current, performance.now() + 6000);
    if (!prev) {
      // Entering the era view (from Flashpoint): turn to the era, no year stamp
      if (!reduced) map.easeTo({ center: [lng, lat], duration: TRAVEL_MS, essential: true });
      else map.jumpTo({ center: [lng, lat] });
      return;
    }
    const swap = reduced ? REDUCED_MS / 2 : SWAP_MS;
    // Sound (FEEL, silent when muted): a page turn as the years roll, the stamp as the pins land
    sound.play('page');
    later(reduced ? REDUCED_MS : DROP_AT, () => sound.play('stamp'));
    // Rim markers wait for the new pins
    const host = map.getContainer().parentElement;
    host?.classList.add('tg-travelling');
    later(reduced ? REDUCED_MS / 2 : DROP_AT, () => host?.classList.remove('tg-travelling'));
    // Labels fade out at once and come back with the pins
    if (map.getLayer('labels')) {
      map.setPaintProperty('labels', 'text-opacity-transition', { duration: reduced ? 70 : 150, delay: 0 });
      map.setPaintProperty('labels', 'text-opacity', 0);
      later(reduced ? REDUCED_MS / 2 : DROP_AT, () => {
        map.setPaintProperty('labels', 'text-opacity-transition', { duration: reduced ? 70 : 230, delay: 0 });
        map.setPaintProperty('labels', 'text-opacity', 1);
      });
    }
    // The fills dip to plain land, swap at `swap`, and come back
    if (map.getLayer('land-veil')) {
      map.setPaintProperty('land-veil', 'fill-opacity-transition', { duration: reduced ? swap : swap - 100, delay: reduced ? 0 : 100 });
      map.setPaintProperty('land-veil', 'fill-opacity', 0.82);
      later(swap, () => {
        map.setPaintProperty('land-veil', 'fill-opacity-transition', { duration: reduced ? REDUCED_MS - swap : 330, delay: 0 });
        map.setPaintProperty('land-veil', 'fill-opacity', 0);
      });
    }
    if (reduced) return;
    map.easeTo({ center: [lng, lat], zoom: Number.isFinite(fitter.fit()) ? fitter.fitAt(lat) : map.getZoom(), duration: TRAVEL_MS, easing: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2), essential: true });
    // The year stamp rolls from the old year to the new one (updated at most every 80 ms)
    const stamp = stampRef.current;
    const from = Number(prev.replace(/\D/g, '')) || eraYear || 0;
    const to = eraYear ?? from;
    if (stamp) {
      // Centred on the globe: the free box is the map's padding box
      const pad = map.getPadding();
      Object.assign(stamp.style, { left: `${pad.left ?? 0}px`, right: `${pad.right ?? 0}px`, top: `${pad.top ?? 0}px`, bottom: `${pad.bottom ?? 0}px` });
      stamp.classList.remove('go');
      void stamp.offsetWidth;
      stamp.classList.add('go');
      const t0 = performance.now();
      const roll = () => {
        const p = Math.min(1, (performance.now() - t0 - 100) / 550);
        const e = p <= 0 ? 0 : 1 - (1 - p) ** 3;
        stamp.textContent = String(Math.round(from + (to - from) * e));
        if (p < 1) later(80, roll);
      };
      stamp.textContent = String(from);
      roll();
    }
  }, [eraId, eraYear, eraFocusKey, ready, fitter, coverOffset]);

  // ---------------------------------------------------------------------------------------------
  // Names: one setData per input change (era, selection, sides), never during a move
  // ---------------------------------------------------------------------------------------------
  const tintKeys = Object.keys(props.tint).sort().join(',');
  const sideKey = era ? (era.situations.find((s) => s.id === selectedSituation)?.countries ?? []).join(',') : '';
  const labelData = useMemo(() => {
    if (!geo) return null;
    if (era) {
      // An era name on the spot (French Algeria, Zaire) replaces the modern name there
      const allow = (era.labelAllow ?? []).filter((id) => {
        const p = labelPoint(geo, id);
        return !p || !era.labels.some((l) => angularDistance(l.at, p) < 4);
      });
      return labelFeatures(geo, {
        names: eraNames(era),
        eraStatus: eraStatusLabels(era),
        merged: era.merged.map((m) => m.id),
        mapLabels: era.labels,
        labelAllow: allow,
        restrict: era.year < 1992,
        sides: sideKey ? sideKey.split(',') : [],
        selected: selectedCountry ?? null,
      });
    }
    const keys = tintKeys ? tintKeys.split(',') : [];
    const sides = labels?.sides ?? (keys.length <= 6 ? keys : []);
    return labelFeatures(geo, { ...labels, sides, selected: labels?.selected ?? selectedCountry ?? null });
  }, [geo, era, sideKey, labels, tintKeys, selectedCountry]);
  const labelWrites = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !labelData) return;
    labelWrites.current++;
    (map.getSource('labels') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: labelData });
    layout.current();
  }, [labelData, ready]);

  // ---------------------------------------------------------------------------------------------
  // Pins (DOM markers): created per era, folded away and dropped in during a time travel
  // ---------------------------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const live = markers.current;
    const tr = travel.current;
    const elapsed = tr ? performance.now() - tr.start : 0;
    for (const [id, p] of live) {
      if (!pins.some((x) => x.id === id)) {
        live.delete(id);
        p.el.classList.add('fold');
        window.setTimeout(() => p.m.remove(), tr?.reduced ? REDUCED_MS : 160);
      }
    }
    const fresh = pins.filter((pin) => !live.has(pin.id));
    const stagger = fresh.length > 1 ? Math.min(30, 120 / (fresh.length - 1)) : 0;
    fresh.forEach((pin, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tg-pin';
      el.innerHTML = '<i class="tg-pin-ring"></i><i class="tg-pin-ring r2"></i><span class="tg-pin-badge"></span><span class="tg-pin-num"></span><span class="tg-pin-count"></span><span class="tg-pin-today">TODAY</span><span class="tg-pin-card"><b class="tg-pin-label"></b><small></small></span>';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = markers.current.get(pin.id);
        if (p?.pin.zone) return;
        // A cluster fans out first; a second tap picks
        if (p && Number(p.el.dataset.count ?? 1) > 1 && fannedRef.current !== pin.id) {
          setFanned({ key: fanKey.current, id: pin.id });
          return;
        }
        const e2 = eraRef.current;
        if (e2) handlers.current.onSituation?.(pin.id.slice(e2.scenarioId.length + 1));
        else handlers.current.onPin(pin.id);
      });
      // Drop in: during a time travel after the camera settles (staggered), else at once
      const delay = tr ? (tr.reduced ? 0 : Math.max(0, DROP_AT - elapsed) + i * stagger) : i * 20;
      el.style.setProperty('--drop-delay', `${Math.round(delay)}ms`);
      el.style.setProperty('--drop-ms', `${tr?.reduced ? REDUCED_MS : DROP_MS}ms`);
      el.classList.add('drop');
      const m = new maplibregl.Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' }).setLngLat(pin.at).addTo(map);
      live.set(pin.id, { m, el, pin });
    });
    for (const pin of pins) {
      const p = live.get(pin.id);
      if (!p) continue;
      p.pin = pin;
      p.m.setLngLat(pin.at);
      p.el.classList.toggle('gold', !!pin.gold);
      p.el.classList.toggle('on', pin.id === selectedPin);
      p.el.classList.toggle('brewing', pin.phase === 'BREWING');
      p.el.classList.toggle('frozen', pin.phase === 'FROZEN');
      p.el.classList.toggle('zone', !!pin.zone);
      p.el.classList.toggle('chip', chips && !pin.zone);
      p.el.classList.toggle('era', !!era);
      p.el.dataset.pin = pin.id;
      p.el.setAttribute('aria-label', `${pin.num ? `${pin.num}. ` : ''}${pin.label}${pin.sub ? `: ${pin.sub}` : ''}`);
      p.el.setAttribute('aria-pressed', String(pin.id === selectedPin));
      const label = p.el.querySelector('.tg-pin-label');
      if (label) label.textContent = pin.label;
      const sub = p.el.querySelector('.tg-pin-card small');
      if (sub) sub.textContent = pin.sub ?? '';
      const num = p.el.querySelector('.tg-pin-num');
      if (num) num.textContent = pin.num ? String(pin.num) : '';
      const badge = p.el.querySelector('.tg-pin-badge');
      if (badge && pin.iconSvg && badge.innerHTML !== pin.iconSvg) badge.innerHTML = pin.iconSvg;
      p.el.style.setProperty('--pin', pin.color ?? '#ff4d4f');
    }
    layout.current();
  }, [pins, selectedPin, ready, chips, era]);

  // ---------------------------------------------------------------------------------------------
  // Layout on the screen: rim markers for the far side, clusters, card sides, label reserve and
  // label obstacles. Runs on camera moves (coalesced to one per frame) and when inputs change.
  // ---------------------------------------------------------------------------------------------
  const nowKey = `${eraId}|${density}|${selectedSituation}`;
  const fanned = fanState && fanState.key === nowKey ? fanState.id : null;
  useEffect(() => {
    fanKey.current = nowKey;
    fannedRef.current = fanned;
    layout.current();
  }, [fanned, nowKey]);
  const reserveKey = useRef('');
  const obstacleTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const el = map.getContainer();
    const rimHost = rimBox.current;

    /** Labels whose box (any of its anchors) would touch a DOM overlay are dropped (no setData). */
    const obstacles = () => {
      if (!labelData) return;
      const host = el.getBoundingClientRect();
      const rects: Rect[] = [];
      const add = (r: DOMRect) => {
        if (r.width > 0 && r.height > 0) rects.push({ left: r.left - host.left, top: r.top - host.top, right: r.right - host.left, bottom: r.bottom - host.top });
      };
      for (const r of rims.current.values()) if (!r.hidden) add(r.getBoundingClientRect());
      for (const { el: pinEl } of markers.current.values()) {
        const card = pinEl.querySelector<HTMLElement>('.tg-pin-card');
        if (card && getComputedStyle(card).opacity !== '0' && getComputedStyle(card).display !== 'none') add(card.getBoundingClientRect());
      }
      for (const o of document.querySelectorAll<HTMLElement>(obstacleSel.current)) {
        if (o.offsetParent !== null || getComputedStyle(o).position === 'fixed') add(o.getBoundingClientRect());
      }
      const c = map.getCenter();
      const center: LngLat = [c.lng, c.lat];
      const hidden: string[] = [];
      for (const f of labelData as LabelFeature[]) {
        const p = f.geometry.coordinates as LngLat;
        if (isFarSide(center, p, 88)) continue;
        const s = map.project(p);
        const { size, name } = f.properties;
        const lines = name.length > 14 && name.includes(' ') ? 2 : 1;
        const w = Math.min(textWidth(name, size), lines > 1 ? textWidth(name, size) / 1.6 : Infinity) + 8;
        const h = size * 1.25 * lines + 6;
        const off = 0.9 * size;
        // The union of every anchor MapLibre may pick (center, top, bottom)
        const box: Rect = { left: s.x - w / 2, right: s.x + w / 2, top: s.y - h - off, bottom: s.y + h + off };
        if (rects.some((r) => hit(box, r))) hidden.push(f.properties.id);
      }
      hidden.sort();
      if (hidden.join(',') !== hiddenLabels.current.join(',')) {
        hiddenLabels.current = hidden;
        applyLabelFilter(map);
      }
    };

    const run = () => {
      const live = markers.current;
      const c = map.getCenter();
      const center: LngLat = [c.lng, c.lat];
      const mid = map.project(center);
      const W = el.clientWidth;
      const edge = W - (map.getPadding().right ?? 0) - 8;
      // 1. Far side: a rim marker on the globe's edge pointing to the situation
      const want = new Set<string>();
      const visible: { id: string; x: number; y: number }[] = [];
      for (const [id, p] of live) {
        const far = isFarSide(center, p.pin.at, 82);
        if (!far) {
          const s = map.project(p.pin.at);
          visible.push({ id, x: s.x, y: s.y });
          continue;
        }
        if (p.pin.zone) continue;
        want.add(id);
        let r = rims.current.get(id);
        if (!r && rimHost) {
          r = document.createElement('button');
          r.type = 'button';
          r.className = 'tg-rim';
          r.innerHTML = '<span class="tg-rim-ring"><span class="tg-rim-icon"></span><b class="tg-rim-num"></b></span><i class="tg-rim-chev" aria-hidden="true"></i><span class="tg-rim-title"></span>';
          r.addEventListener('click', (e) => {
            e.stopPropagation();
            const cur = markers.current.get(id);
            if (!cur) return;
            const e2 = eraRef.current;
            if (e2) handlers.current.onSituation?.(id.slice(e2.scenarioId.length + 1));
            else handlers.current.onPin(id);
          });
          rimHost.append(r);
          rims.current.set(id, r);
        }
        if (!r) continue;
        r.hidden = false;
        r.style.setProperty('--pin', p.pin.color ?? '#ff4d4f');
        const icon = r.querySelector('.tg-rim-icon');
        if (icon && p.pin.iconSvg && icon.innerHTML !== p.pin.iconSvg) icon.innerHTML = p.pin.iconSvg;
        const num = r.querySelector('.tg-rim-num');
        if (num) num.textContent = p.pin.num ? String(p.pin.num) : '';
        const title = r.querySelector('.tg-rim-title');
        if (title) title.textContent = p.pin.label;
        r.classList.toggle('titled', !!eraRef.current && density === 'all' && !isPhone());
        r.setAttribute('aria-label', `${p.pin.num ? `${p.pin.num}. ` : ''}${p.pin.label}: on the far side, turn the globe to it`);
        r.dataset.pin = id;
        const rp = map.project(rimPoint(center, p.pin.at, 80));
        const ang = Math.atan2(rp.y - mid.y, rp.x - mid.x);
        // Kept whole on screen (on a phone the rim touches the screen edge)
        const rx = Math.min(W - 24, Math.max(24, rp.x));
        const ry = Math.min(el.clientHeight - 24, Math.max(24, rp.y));
        r.style.transform = `translate(${Math.round(rx)}px, ${Math.round(ry)}px)`;
        r.style.setProperty('--ang', `${ang}rad`);
        r.classList.toggle('left', Math.cos(ang) < 0);
      }
      for (const [id, r] of rims.current) {
        if (!want.has(id)) {
          if (!live.has(id)) {
            r.remove();
            rims.current.delete(id);
          } else r.hidden = true;
        }
      }
      // 2. Clusters: pins closer than 28 px merge behind a count; a tapped cluster fans out
      const groups = clusterPins(visible, 28);
      let fanStill = false;
      for (const [leader, ids] of groups) {
        const fan = fannedRef.current === leader && ids.length > 1;
        if (fan) fanStill = true;
        const offs = fanOffsets(ids.length);
        ids.forEach((id, i) => {
          const p = live.get(id);
          if (!p) return;
          const lead = i === 0;
          p.el.dataset.count = lead ? String(ids.length) : '1';
          p.el.classList.toggle('clustered', !lead && !fan);
          p.el.classList.toggle('fanned', fan && !lead);
          const cnt = p.el.querySelector('.tg-pin-count');
          if (cnt) cnt.textContent = lead && ids.length > 1 && !fan ? `+${ids.length - 1}` : '';
          const o = fan ? offs[i] : [0, 0];
          const cur = p.m.getOffset();
          if (cur.x !== o[0] || cur.y !== o[1]) p.m.setOffset(o as [number, number]);
        });
      }
      if (fannedRef.current && !fanStill) fannedRef.current = null;
      // 3. Cards and chips open to the right unless they would run under the dossier
      for (const { m, el: pinEl } of live.values()) {
        const card = pinEl.querySelector<HTMLElement>('.tg-pin-card');
        const w = card?.offsetWidth || 220;
        pinEl.classList.toggle('flip', map.project(m.getLngLat()).x + 38 + w > edge);
      }
      // 3b. Chips (variant A) never cover each other, another pin, a rim marker or the page's
      // panels: the lighter situation's chip hides (its pin, its hover card and the list keep it)
      const hostR = el.getBoundingClientRect();
      const rel = (r: DOMRect): Rect => ({ left: r.left - hostR.left, top: r.top - hostR.top, right: r.right - hostR.left, bottom: r.bottom - hostR.top });
      const panels: Rect[] = [];
      for (const o of document.querySelectorAll<HTMLElement>(obstacleSel.current)) {
        const r = o.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) panels.push(rel(r));
      }
      const rimRects: Rect[] = [];
      for (const r of rims.current.values()) if (!r.hidden) rimRects.push(rel(r.querySelector('.tg-rim-ring')?.getBoundingClientRect() ?? r.getBoundingClientRect()));
      const pinRects = visible.map((v) => ({ id: v.id, r: { left: v.x - 16, right: v.x + 16, top: v.y - 16, bottom: v.y + 16 } }));
      const taken: Rect[] = [];
      for (const [id, p] of live) {
        if (!p.el.classList.contains('chip')) {
          p.el.classList.remove('chip-off');
          continue;
        }
        const v = visible.find((x) => x.id === id);
        const card = p.el.querySelector<HTMLElement>('.tg-pin-card');
        if (!v || !card || p.el.classList.contains('clustered')) {
          p.el.classList.add('chip-off');
          continue;
        }
        const o = p.m.getOffset();
        const x = v.x + o.x;
        const y = v.y + o.y;
        const cw = card.offsetWidth;
        const ch = card.offsetHeight;
        const flip = p.el.classList.contains('flip');
        const r: Rect = { left: flip ? x - 23 - cw : x + 23, right: flip ? x - 23 : x + 23 + cw, top: y - ch / 2, bottom: y + ch / 2 };
        const bad = r.left < 0 || r.right > W || taken.some((t) => hit(r, t)) || panels.some((t) => hit(r, t)) || rimRects.some((t) => hit(r, t)) || pinRects.some((q) => q.id !== id && hit(r, q.r));
        p.el.classList.toggle('chip-off', bad);
        if (!bad) taken.push(r);
      }
      // Rim titles (variant A, desktop) follow the same rule
      for (const r of rims.current.values()) {
        const t = r.querySelector<HTMLElement>('.tg-rim-title');
        if (r.hidden || !t || !r.classList.contains('titled')) continue;
        const tr = rel(t.getBoundingClientRect());
        const bad = tr.left < 0 || tr.right > W || taken.some((x) => hit(tr, x)) || panels.some((x) => hit(tr, x));
        r.classList.toggle('title-off', bad);
        if (!bad) taken.push(tr);
      }
      // 4. Label reserve: each pin, and each visible chip, as invisible boxes the names avoid
      const scale = (px: number) => px / RESERVE_IMAGE_SIZE;
      const feats: GeoJSON.Feature[] = [];
      for (const { pin, el: pinEl } of live.values()) {
        if (pinEl.classList.contains('fold') || pinEl.classList.contains('clustered')) continue;
        const o = markers.current.get(pin.id)?.m.getOffset() ?? { x: 0, y: 0 };
        const sq = (px: number, dx: number, dy: number): GeoJSON.Feature => ({ type: 'Feature', properties: { size: scale(px), offset: [dx / scale(px), dy / scale(px)] }, geometry: { type: 'Point', coordinates: pin.at } });
        feats.push(sq(PIN_PX + 4, o.x, o.y));
        if (pin.gold) feats.push(sq(PIN_PX, o.x, o.y - 24));
        const card = pinEl.querySelector<HTMLElement>('.tg-pin-card');
        const chipOn = pinEl.classList.contains('chip') && !pinEl.classList.contains('chip-off');
        const shown = card && (chipOn || (pinEl.classList.contains('on') && !pinEl.classList.contains('era'))) && getComputedStyle(card).display !== 'none';
        if (card && shown) {
          const cw = card.offsetWidth;
          const ch = card.offsetHeight;
          const flip = pinEl.classList.contains('flip');
          for (let x = 0; x < cw; x += ch) {
            const step = Math.min(ch, cw - x);
            const cx = 23 + x + step / 2;
            feats.push(sq(ch + 2, o.x + (flip ? -cx : cx), o.y));
          }
        }
      }
      const key = JSON.stringify(feats.map((f) => [f.properties?.offset, f.properties?.size, (f.geometry as GeoJSON.Point).coordinates]));
      if (key !== reserveKey.current) {
        reserveKey.current = key;
        (map.getSource('pin-reserve') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: feats });
      }
      // 5. Label obstacles (DOM overlays), debounced: the result only matters once a move settles
      window.clearTimeout(obstacleTimer.current);
      obstacleTimer.current = window.setTimeout(obstacles, 140);
    };
    let raf = 0;
    const onMove = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        run();
      });
    };
    layout.current = onMove;
    map.on('move', onMove);
    map.on('moveend', onMove);
    window.addEventListener('resize', onMove);
    onMove();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(obstacleTimer.current);
      map.off('move', onMove);
      map.off('moveend', onMove);
      window.removeEventListener('resize', onMove);
      layout.current = () => undefined;
    };
  }, [ready, labelData, density, applyLabelFilter]);

  // ---------------------------------------------------------------------------------------------
  // Colours: tints (era fills or difficulty), bloc outlines, merged hairlines, the picked country.
  // During a time travel the swap waits for the veil (320 ms, 75 ms with reduced motion).
  // ---------------------------------------------------------------------------------------------
  const painted = useRef<string[]>([]);
  const paintedShapes = useRef<string[]>([]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const apply = () => {
      for (const id of painted.current) map.setFeatureState({ source: 'land', id }, { tint: null, sel: false, outline: null, merged: null });
      const ids = new Set([...Object.keys(fills.fill), ...Object.keys(fills.outline)]);
      for (const id of ids) map.setFeatureState({ source: 'land', id }, { tint: fills.fill[id] ?? null, outline: fills.outline[id] ?? null, merged: fills.merged[id] ?? null, sel: id === selectedCountry });
      if (selectedCountry && !ids.has(selectedCountry)) map.setFeatureState({ source: 'land', id: selectedCountry }, { sel: true });
      painted.current = [...ids, ...(selectedCountry ? [selectedCountry] : [])];
      // Era shapes (if the static file is present): drawn only when a bloc or the era names them
      if (shapes && map.getSource('era-shapes')) {
        for (const id of paintedShapes.current) map.setFeatureState({ source: 'era-shapes', id }, { tint: null, on: false });
        const named = new Set([...(era?.blocs.flatMap((b) => b.members) ?? []), ...(era?.countries.map((c) => c.id) ?? [])]);
        const on = [...shapes].filter((id) => !!era && named.has(id));
        for (const id of on) map.setFeatureState({ source: 'era-shapes', id }, { tint: fills.fill[id] ?? '#18233a', on: true });
        paintedShapes.current = on;
      }
    };
    const tr = travel.current;
    const wait = tr ? (tr.reduced ? REDUCED_MS / 2 : SWAP_MS) - (performance.now() - tr.start) : 0;
    if (wait > 8) {
      const t = window.setTimeout(apply, wait);
      return () => window.clearTimeout(t);
    }
    apply();
  }, [fills, selectedCountry, ready, shapes, era]);

  // Lines: fronts, rivals, blockades (one source, written when the era, switch or pick changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource('arcs') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: arcs.map((a) => ({ type: 'Feature', properties: { color: a.color, on: !!a.on, style: a.style ?? 'rival' }, geometry: { type: 'LineString', coordinates: arcLine(a.from, a.to) } })),
    });
  }, [arcs, ready]);

  // Framing a pick: turn to it, a little closer than the fit, centred in the free box (the fit's
  // padding keeps it out from under the dossier). A pin frames at fit + 0.6 (phone + 0.4), a nation
  // at fit + 0.3. Once the player has picked a place, the globe stays put on it.
  const focusKey = focus ? `${focus[0]},${focus[1]}` : '';
  const pinAtFocus = !!focus && pins.some((p) => p.at[0] === focus[0] && p.at[1] === focus[1]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusKey) return;
    const [lng, lat] = focusKey.split(',').map(Number);
    hold.current = Number.POSITIVE_INFINITY;
    const offset = pinAtFocus ? (isPhone() ? 0.4 : 0.6) : 0.3;
    framed.current = offset;
    fitter.resetUserZoom();
    const fit = fitter.fitAt(lat);
    const zoom = Number.isFinite(fit) ? fit + offset : map.getZoom();
    const reduced = reducedMotion();
    // Narrow desktops: the pick sits between the copy column and the dossier, not under the copy
    const dx = coverOffset(map);
    map.easeTo({ center: [lng, lat], zoom, offset: [dx, 0], duration: reduced ? 0 : 900, essential: true });
  }, [focusKey, pinAtFocus, ready, fitter, coverOffset]);

  // A pick that clears (no focus) lets the spin decide again
  useEffect(() => {
    if (!focusKey && ready) {
      framed.current = null;
      if (hold.current === Number.POSITIVE_INFINITY) hold.current = 0;
      kick.current();
    }
  }, [focusKey, ready]);

  // Dev and QA hook: what the globe shows, for the worldmap QA scenario
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __wcTitleGlobe?: unknown }).__wcTitleGlobe = {
      labelWrites: () => labelWrites.current,
      hiddenLabels: () => [...hiddenLabels.current],
      pins: () => [...markers.current.values()].map(({ pin, el }) => ({ id: pin.id, num: pin.num ?? null, phase: pin.phase ?? null, at: pin.at, clustered: el.classList.contains('clustered'), rect: el.getBoundingClientRect().toJSON() })),
      rims: () => [...rims.current.entries()].filter(([, r]) => !r.hidden).map(([id, r]) => ({ id, rect: r.getBoundingClientRect().toJSON() })),
      travelling: () => !!travel.current,
      fit: () => fitter.fit(),
    };
  }, [fitter]);

  const ink = era ? (ERA_INK[era.scenarioId] ?? 0) : 0;
  return (
    <div className={`tg ${era ? 'tg-era' : ''}`} aria-hidden={failed} style={{ ['--tg-pad' as string]: `${padRight}px` }}>
      <div ref={box} className="tg-map" />
      <div className="tg-ink" style={{ opacity: ink }} aria-hidden />
      <div ref={rimBox} className="tg-rims" />
      <div ref={stampRef} className="tg-stamp num" aria-hidden />
      <div ref={tipRef} className="tg-tip" role="tooltip" hidden />
      {failed && <div className="tg-fallback" />}
    </div>
  );
}
