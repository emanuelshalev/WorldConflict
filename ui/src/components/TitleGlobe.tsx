import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { featureId, loadWorld, type WorldGeo } from '../scenes/worldGeo';
import { type GlobeFitState, PHONE_MAX, titleInsets, useGlobeFit } from '../lib/globeFit';
import {
  FONT_ITALIC,
  FONT_REGULAR,
  FONT_SEMIBOLD,
  GLYPHS_URL,
  type LabelOptions,
  labelFeatures,
  labelFilter,
} from '../lib/mapLabels';
import { isIdle, onIdleChange, useIdle } from '../lib/motion';
import { RESERVE_IMAGE, RESERVE_IMAGE_SIZE } from './mapMarkers';

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
}

export interface GlobeArc {
  from: [number, number];
  to: [number, number];
  color: string;
  on?: boolean;
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
}

/** The pin element is 30 px square (title.css .tg-pin): one reserve icon of that size per pin. */
const PIN_PX = 30;
/** Spin speed: degrees of longitude per second, stepped at about 30 fps. */
const SPIN_DEG_S = 1.8;
const SPIN_STEP_MS = 33;
/** Phones stop turning after 8 s (battery). */
const PHONE_SPIN_MS = 8000;

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

/**
 * The title screen's world: a globe that fits the free part of the screen, names on its countries
 * and a pin on every live crisis. It turns slowly for the first seconds, then holds still: hover,
 * touch, a pick, an idle page, a hidden tab or reduced motion stop it. Pick a pin or a country and
 * the camera turns there.
 */
export function TitleGlobe({ pins, selectedPin, onPin, tint, selectedCountry, onCountry, focus, padRight, arcs = [], labels }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLButtonElement }>());
  const [ready, setReady] = useState(false);
  const [geo, setGeo] = useState<WorldGeo | null>(null);
  const [fitTarget, setFitTarget] = useState<{ map: maplibregl.Map; el: HTMLElement } | null>(null);
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
  const onPinRef = useRef(onPin);
  const onCountryRef = useRef(onCountry);
  useEffect(() => {
    onPinRef.current = onPin;
    onCountryRef.current = onCountry;
  });
  useIdle();

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
      map.addLayer({ id: 'land-line', type: 'line', source: 'land', paint: { 'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#ffd08a', '#0a1628'], 'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2, 0.6] } });
      map.addSource('arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'arcs-glow', type: 'line', source: 'arcs', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'on'], 7, 4], 'line-opacity': 0.18, 'line-blur': 4 } });
      map.addLayer({ id: 'arcs', type: 'line', source: 'arcs', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'on'], 2.4, 1.4], 'line-opacity': ['case', ['get', 'on'], 1, 0.7], 'line-dasharray': [0, 2, 3] } });
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
          'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
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
        },
      });
      // Invisible footprints of the DOM pins, above the labels so they are placed first and names
      // move to a free side or drop out instead of printing over a pin (design-feel 8.3)
      map.addImage(RESERVE_IMAGE, { width: RESERVE_IMAGE_SIZE, height: RESERVE_IMAGE_SIZE, data: new Uint8Array(RESERVE_IMAGE_SIZE * RESERVE_IMAGE_SIZE * 4) });
      map.addSource('pin-reserve', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'pin-reserve',
        type: 'symbol',
        source: 'pin-reserve',
        layout: { 'icon-image': RESERVE_IMAGE, 'icon-size': PIN_PX / RESERVE_IMAGE_SIZE, 'icon-offset': ['get', 'offset'], 'icon-allow-overlap': true, 'icon-ignore-placement': false },
        paint: { 'icon-opacity': 0 },
      });
      map.on('click', 'land', (e) => {
        const id = e.features?.[0]?.properties?.gid as string | undefined;
        if (id) onCountryRef.current?.(id);
      });
      map.on('mousemove', 'land', () => (map.getCanvas().style.cursor = onCountryRef.current ? 'pointer' : ''));
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
      start();
    };
    const touch = () => {
      hold.current = performance.now() + 6000;
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

  // Fit: the globe fills the free part of the screen, on load and on every resize
  const framed = useRef<number | null>(null); // zoom offset from the fit while a pick is framed
  const updateTiers = useCallback((map: maplibregl.Map, fit: number) => {
    if (!map.getLayer('labels') || !Number.isFinite(fit)) return;
    map.setFilter('labels', labelFilter(map.getZoom(), fit, isPhone()) as maplibregl.FilterSpecification);
  }, []);
  const fitter = useGlobeFit(
    fitTarget?.map ?? null,
    fitTarget?.el ?? null,
    (w, h) => titleInsets(w, h, padRight),
    (fit: number, s: GlobeFitState) => {
      const map = mapRef.current;
      if (!map) return;
      if (framed.current !== null && !s.userZoomed) map.jumpTo({ zoom: fit + framed.current });
      updateTiers(map, fit);
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

  // Names: one setData per input change (selection, sides, era options), never during a move
  const tintKeys = Object.keys(tint).sort().join(',');
  const labelData = useMemo(() => {
    if (!geo) return null;
    const keys = tintKeys ? tintKeys.split(',') : [];
    const sides = labels?.sides ?? (keys.length <= 6 ? keys : []);
    return labelFeatures(geo, { ...labels, sides, selected: labels?.selected ?? selectedCountry ?? null });
  }, [geo, labels, tintKeys, selectedCountry]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !labelData) return;
    (map.getSource('labels') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: labelData });
  }, [labelData, ready]);

  // Pins (DOM markers) and their label reservations
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const live = markers.current;
    for (const [id, p] of live) {
      if (!pins.some((x) => x.id === id)) {
        p.m.remove();
        live.delete(id);
      }
    }
    for (const pin of pins) {
      let p = live.get(pin.id);
      if (!p) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'tg-pin';
        el.innerHTML = '<i class="tg-pin-ring"></i><i class="tg-pin-ring r2"></i><span class="tg-pin-badge"></span><span class="tg-pin-today">TODAY</span><span class="tg-pin-card"><b class="tg-pin-label"></b><small></small></span>';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onPinRef.current(pin.id);
        });
        const m = new maplibregl.Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' }).setLngLat(pin.at).addTo(map);
        p = { m, el };
        live.set(pin.id, p);
      }
      p.m.setLngLat(pin.at);
      p.el.classList.toggle('gold', !!pin.gold);
      p.el.classList.toggle('on', pin.id === selectedPin);
      p.el.setAttribute('aria-label', pin.label);
      p.el.setAttribute('aria-pressed', String(pin.id === selectedPin));
      const label = p.el.querySelector('.tg-pin-label');
      if (label) label.textContent = pin.label;
      const sub = p.el.querySelector('.tg-pin-card small');
      if (sub) sub.textContent = pin.sub ?? '';
      const badge = p.el.querySelector('.tg-pin-badge');
      if (badge && pin.iconSvg && badge.innerHTML !== pin.iconSvg) badge.innerHTML = pin.iconSvg;
      p.el.style.setProperty('--pin', pin.color ?? '#ff4d4f');
    }
  }, [pins, selectedPin, ready]);
  // One 30 px footprint per pin; a gold pin also reserves its TODAY tag above it
  const pinKey = pins.map((p) => `${p.at[0]},${p.at[1]},${p.gold ? 1 : 0}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const scale = PIN_PX / RESERVE_IMAGE_SIZE;
    const features: GeoJSON.Feature[] = pinKey
      ? pinKey.split('|').flatMap((s) => {
          const [lng, lat, gold] = s.split(',').map(Number);
          const at = (dy: number): GeoJSON.Feature => ({ type: 'Feature', properties: { offset: [0, dy / scale] }, geometry: { type: 'Point', coordinates: [lng, lat] } });
          return gold ? [at(0), at(-24)] : [at(0)];
        })
      : [];
    (map.getSource('pin-reserve') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
  }, [pinKey, ready]);

  // A card opens to the right of its pin unless it would run under the dossier or off the screen:
  // then it flips to the left
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const place = () => {
      const edge = map.getContainer().clientWidth - (map.getPadding().right ?? 0) - 8;
      for (const { m, el } of markers.current.values()) {
        const card = el.querySelector<HTMLElement>('.tg-pin-card');
        const w = card?.offsetWidth || 220;
        el.classList.toggle('flip', map.project(m.getLngLat()).x + 38 + w > edge);
      }
    };
    place();
    map.on('moveend', place);
    return () => {
      map.off('moveend', place);
    };
  }, [pins, ready]);

  // Tints and the selected country
  const tinted = useRef<string[]>([]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const id of tinted.current) map.setFeatureState({ source: 'land', id }, { tint: null, sel: false });
    const ids = Object.keys(tint);
    for (const id of ids) map.setFeatureState({ source: 'land', id }, { tint: tint[id], sel: id === selectedCountry });
    if (selectedCountry && !tint[selectedCountry]) map.setFeatureState({ source: 'land', id: selectedCountry }, { sel: true });
    tinted.current = [...ids, ...(selectedCountry ? [selectedCountry] : [])];
  }, [tint, selectedCountry, ready]);

  // Rival lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource('arcs') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: arcs.map((a) => ({ type: 'Feature', properties: { color: a.color, on: !!a.on }, geometry: { type: 'LineString', coordinates: arcLine(a.from, a.to) } })),
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
    const fit = fitter.fit();
    const zoom = Number.isFinite(fit) ? fit + offset : map.getZoom();
    const reduced = reducedMotion();
    map.easeTo({ center: [lng, lat], zoom, duration: reduced ? 0 : 900, essential: true });
  }, [focusKey, pinAtFocus, ready, fitter]);

  // A pick that clears (no focus) lets the spin decide again
  useEffect(() => {
    if (!focusKey && ready) {
      framed.current = null;
      if (hold.current === Number.POSITIVE_INFINITY) hold.current = 0;
      kick.current();
    }
  }, [focusKey, ready]);

  return (
    <div className="tg" aria-hidden={failed}>
      <div ref={box} className="tg-map" />
      {failed && <div className="tg-fallback" />}
    </div>
  );
}
