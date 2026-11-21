import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { featureId, loadWorld } from '../scenes/worldGeo';

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
  /** Width of the dossier on the right: the globe centres in the space left of it. */
  padRight: number;
  arcs?: GlobeArc[];
}

/**
 * The title screen's world: a slowly turning globe with a pin on every live crisis. Pick a pin or
 * a country and the camera flies there. Stops turning on hover, touch, or with reduced motion.
 */
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

export function TitleGlobe({ pins, selectedPin, onPin, tint, selectedCountry, onCountry, focus, padRight, arcs = [] }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLButtonElement }>());
  const [ready, setReady] = useState(false);
  // No WebGL (old devices, some locked-down browsers): a painted backdrop instead of the globe
  const [failed] = useState(() => {
    try {
      return !document.createElement('canvas').getContext('webgl2') && !document.createElement('canvas').getContext('webgl');
    } catch {
      return true;
    }
  });
  const hold = useRef(0); // time until which the spin stays paused
  const onPinRef = useRef(onPin);
  const onCountryRef = useRef(onCountry);
  useEffect(() => {
    onPinRef.current = onPin;
    onCountryRef.current = onCountry;
  });

  useEffect(() => {
    if (!box.current || failed) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: box.current,
        style: {
          version: 8,
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
        zoom: window.innerWidth < 700 ? 0.9 : 1.55,
        minZoom: 0.8,
        maxZoom: 4,
        attributionControl: false,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      return;
    }
    mapRef.current = map;
    map.on('error', () => undefined);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let raf = 0;
    map.on('load', async () => {
      const geo = await loadWorld().catch(() => null);
      if (!geo) return;
      const withId = { ...geo, features: geo.features.map((f) => ({ ...f, properties: { ...f.properties, gid: featureId(f) } })) };
      map.addSource('land', { type: 'geojson', data: withId, promoteId: 'gid' });
      map.addLayer({ id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': ['coalesce', ['feature-state', 'tint'], '#18233a'], 'fill-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 0.95, 0.85] } });
      map.addLayer({ id: 'land-line', type: 'line', source: 'land', paint: { 'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#ffd08a', '#0a1628'], 'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2, 0.6] } });
      map.addSource('arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'arcs-glow', type: 'line', source: 'arcs', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'on'], 7, 4], 'line-opacity': 0.18, 'line-blur': 4 } });
      map.addLayer({ id: 'arcs', type: 'line', source: 'arcs', layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'on'], 2.4, 1.4], 'line-opacity': ['case', ['get', 'on'], 1, 0.7], 'line-dasharray': [0, 2, 3] } });
      map.on('click', 'land', (e) => {
        const id = e.features?.[0]?.properties?.gid as string | undefined;
        if (id) onCountryRef.current?.(id);
      });
      map.on('mousemove', 'land', () => (map.getCanvas().style.cursor = onCountryRef.current ? 'pointer' : ''));
      setReady(true);
    });
    const pause = () => (hold.current = performance.now() + 6000);
    box.current.addEventListener('pointerdown', pause);
    box.current.addEventListener('mouseenter', pause);
    const dashes = [
      [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
      [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
    ];
    let step = -1;
    const spin = (t: number) => {
      raf = requestAnimationFrame(spin);
      // Marching dashes on the rival lines (about 9 steps a second)
      const s2 = Math.floor(t / 110) % dashes.length;
      if (!reduced && s2 !== step && map.getLayer('arcs')) {
        step = s2;
        map.setPaintProperty('arcs', 'line-dasharray', dashes[s2]);
      }
      if (reduced || t < hold.current || map.isMoving()) return;
      const c = map.getCenter();
      map.setCenter([c.lng + 0.03, c.lat]);
    };
    raf = requestAnimationFrame(spin);
    const pins = markers.current;
    return () => {
      cancelAnimationFrame(raf);
      for (const p of pins.values()) p.m.remove();
      pins.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [failed]);

  // Pins
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

  // Camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPadding({ top: 40, bottom: 40, left: 0, right: padRight });
    if (focus) {
      // Once the player has picked a place, the globe stays put on it
      hold.current = Number.POSITIVE_INFINITY;
      map.flyTo({ center: focus, zoom: window.innerWidth < 700 ? 1.6 : 2.3, duration: 1300, essential: true });
    }
  }, [focus, padRight, ready]);

  return (
    <div className="tg" aria-hidden={failed}>
      <div ref={box} className="tg-map" />
      {failed && <div className="tg-fallback" />}
    </div>
  );
}
