import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGameStore } from '../store/gameStore';
import type { PlayerViewCountry, War } from '../store/gameStore';
import { CountryDetailPanel } from './CountryDetailPanel';
import { MapGuide } from './MapGuide';

// Capital/centroid anchors for labels, icons and relationship lines
/** Lat/long grid every 20 degrees: the ops-display look under the land. */
function graticule(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let lng = -180; lng <= 180; lng += 20) {
    const coords: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 5) coords.push([lng, lat]);
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} });
  }
  for (let lat = -60; lat <= 80; lat += 20) {
    const coords: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 5) coords.push([lng, lat]);
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} });
  }
  return { type: 'FeatureCollection', features };
}

/** A bowed arc between two points (quadratic curve), for war vectors. */
function arc(a: [number, number], b: [number, number], bow = 0.18): [number, number][] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const c: [number, number] = [(a[0] + b[0]) / 2 - dy * bow, (a[1] + b[1]) / 2 + dx * bow];
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return pts;
}

const COUNTRY_CENTERS: Record<string, [number, number]> = {
  USA: [-98.5, 39.8], CHN: [104.1, 35.8], RUS: [60.0, 58.0], DEU: [10.4, 51.1],
  IND: [78.9, 22.0], BRA: [-51.9, -10.0], CAN: [-106.3, 56.1], MEX: [-102.5, 23.6],
  FRA: [2.2, 46.2], GBR: [-1.5, 52.3], POL: [19.1, 51.9], TUR: [35.2, 38.9],
  SAU: [45.0, 23.8], IRN: [53.6, 32.4], ISR: [34.8, 31.0], EGY: [30.8, 26.8],
  JPN: [138.2, 36.2], IDN: [113.9, -0.7], KOR: [127.7, 35.9], PRK: [127.5, 40.3],
  AUS: [133.7, -25.2], PAK: [69.3, 30.3], NGA: [8.6, 9.0], ZAF: [22.9, -30.5],
  ITA: [12.5, 42.8],
};

// Okabe-Ito categorical palette: colorblind-safe and value-neutral
const REGIME_COLORS: Record<string, string> = {
  DEMOCRACY: '#0072B2',
  AUTOCRACY: '#D55E00',
  COMMUNIST: '#CC79A7',
  MONARCHY: '#009E73',
  THEOCRACY: '#E69F00',
  MILITARY_JUNTA: '#7f6a55',
};

// Blue (friendly) ↔ orange (hostile) diverging scale, never red/green
function relationColor(rel: number): string {
  const t = Math.max(-1, Math.min(1, rel / 80));
  if (t >= 0) return `rgb(${Math.round(60 - t * 20)}, ${Math.round(95 + t * 45)}, ${Math.round(140 + t * 113)})`;
  const u = -t;
  return `rgb(${Math.round(70 + u * 172)}, ${Math.round(85 + u * 22)}, ${Math.round(110 - u * 52)})`;
}

const LAYERS = [
  { id: 'relations', label: 'Relations', icon: '🤝' },
  { id: 'political', label: 'Regimes', icon: '🏛' },
  { id: 'military', label: 'Military', icon: '🛡' },
  { id: 'economic', label: 'Economic', icon: '💰' },
  { id: 'stability', label: 'Stability', icon: '⚖' },
  { id: 'intelligence', label: 'Intel', icon: '🕵' },
  { id: 'nuclear', label: 'Nuclear', icon: '☢' },
] as const;

function countryColor(view: PlayerViewCountry, layer: string, maxStrength: number): string {
  switch (layer) {
    case 'relations':
      return view.isPlayer ? '#F2A93B' : relationColor(view.relationWithPlayer);
    case 'political':
      return REGIME_COLORS[view.regimeType] ?? '#555';
    case 'military': {
      const t = Math.min(1, view.militaryStrength.estimate / Math.max(1, maxStrength));
      return `rgb(${Math.round(60 + t * 195)}, ${Math.round(40 + (1 - t) * 40)}, 40)`;
    }
    case 'economic': {
      const t = Math.min(1, Math.log10(Math.max(1e9, view.gdp.estimate)) / 13.6);
      return `rgb(30, ${Math.round(60 + t * 170)}, ${Math.round(40 + t * 60)})`;
    }
    case 'stability': {
      const hue = (view.stability.estimate / 100) * 120; // red → green
      return `hsl(${hue}, 60%, 38%)`;
    }
    case 'intelligence': {
      if (view.isPlayer) return '#2a6dd9';
      const c = view.intelConfidence;
      return `hsl(210, ${Math.round(c * 0.5)}%, ${18 + (c / 100) * 30}%)`;
    }
    case 'nuclear': {
      switch (view.nuclearStatus) {
        case 'ARMED': return '#c92a2a';
        case 'TESTED': return '#e8590c';
        case 'DEVELOPING': return '#e6a23c';
        case 'LATENT': return '#7a7a52';
        default: return '#3c4048';
      }
    }
    default:
      return '#555';
  }
}

function buildTooltip(view: PlayerViewCountry, wars: War[]): string {
  const fmt = (n: number) =>
    n >= 1e12 ? `$${(n / 1e12).toFixed(1)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(0)}B` : `$${(n / 1e6).toFixed(0)}M`;
  const range = (r: { low: number; high: number; confidence: number }, f: (x: number) => string) =>
    r.confidence > 85 ? f((r.low + r.high) / 2) : `${f(r.low)} – ${f(r.high)}`;
  const atWar = wars.some((w) => w.attackerId === view.id || w.defenderId === view.id);
  const nuclearBadge =
    view.nuclearStatus === 'ARMED' || view.nuclearStatus === 'TESTED'
      ? ' ☢'
      : view.nuclearStatus === 'DEVELOPING'
        ? ' ☢?'
        : '';
  return `
    <div style="font-family: inherit; min-width: 220px">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px">${view.name}${nuclearBadge}${atWar ? ' ⚔️' : ''}</div>
      <div style="color: #aaa; font-size: 11px; margin-bottom: 6px">${view.leader.title} ${view.leader.name} · ${view.regimeType.replace('_', ' ')}</div>
      ${view.isPlayer ? '' : `<div style="font-size:12px">Relations: <b>${view.diplomaticLevel.replace('_', ' ')}</b> (${Math.round(view.relationWithPlayer)})</div>`}
      <div style="font-size:12px">GDP: ${range(view.gdp, fmt)}</div>
      <div style="font-size:12px">Stability: ${range(view.stability, (x) => `${Math.round(x)}%`)}</div>
      ${view.insurgencyLevel !== 'NONE' ? `<div style="font-size:12px;color:#e8a13c">🔥 Insurgency: ${view.insurgencyLevel}</div>` : ''}
      ${view.isPlayer ? '' : `<div style="font-size:11px;color:#888;margin-top:4px">Intel confidence: ${Math.round(view.intelConfidence)}%</div>`}
      <div style="font-size:10px;color:#666;margin-top:4px">Click for dossier & actions</div>
    </div>`;
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const geoRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const pulseRef = useRef<number>(0);

  const worldState = useGameStore((s) => s.worldState);
  const playerView = useGameStore((s) => s.playerView);
  const mapLayer = useGameStore((s) => s.mapLayer);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const selectCountry = useGameStore((s) => s.selectCountry);
  const setMapLayer = useGameStore((s) => s.setMapLayer);

  // ------------------------------------------------------------------
  // Map bootstrap
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      // Keyless style: stylized ocean + Natural Earth land polygons (no tile provider)
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {},
        layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#0b1a30' } }],
        // A real globe with an atmosphere halo, flattening to Mercator as you zoom in
        projection: { type: 'globe' },
        sky: {
          'sky-color': '#0b1a30',
          'horizon-color': '#2a5aa8',
          'fog-color': '#0b1a30',
          'sky-horizon-blend': 0.6,
          'horizon-fog-blend': 0.7,
          'fog-ground-blend': 0.9,
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.6, 7, 0],
        },
      },
      center: [15, 25],
      zoom: 1.8,
      minZoom: 1.2,
      maxZoom: 7,
      attributionControl: false,
    });
    // Credits as a discreet watermark, bottom left
    map.addControl(
      new maplibregl.AttributionControl({ compact: false, customAttribution: 'Natural Earth' }),
      'bottom-left',
    );
    // Bottom-left: the mission chip owns the top-left corner
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    mapRef.current = map;
    // Dev only: lets the landing-page recorder drive the camera
    if (import.meta.env.DEV) (window as unknown as { __wcMap?: maplibregl.Map }).__wcMap = map;
    // The canvas extends under the glass HUD and desk (see .map-stage in wc.css): keep the
    // camera centred on the visible part
    map.setPadding({ top: 64, bottom: Math.round(window.innerHeight * 0.6), left: 0, right: 0 });

    map.on('load', async () => {
      const res = await fetch('/world.geojson');
      const geo = (await res.json()) as GeoJSON.FeatureCollection;
      geoRef.current = geo;

      map.addSource('graticule', { type: 'geojson', data: graticule() });
      map.addLayer({
        id: 'graticule',
        type: 'line',
        source: 'graticule',
        paint: { 'line-color': '#1d2c45', 'line-width': 0.6, 'line-opacity': 0.7 },
      });
      // Every country on Earth as muted land; simulated countries are drawn on top
      map.addSource('land', { type: 'geojson', data: geo });
      map.addLayer({
        id: 'land-fill',
        type: 'fill',
        source: 'land',
        paint: { 'fill-color': '#1a2233' },
      });
      map.addLayer({
        id: 'land-borders',
        type: 'line',
        source: 'land',
        paint: { 'line-color': '#2a3448', 'line-width': 0.5 },
      });

      map.addSource('countries', { type: 'geojson', data: emptyFC() });
      map.addSource('lines', { type: 'geojson', data: emptyFC() });
      map.addSource('icons', { type: 'geojson', data: emptyFC() });

      map.addLayer({
        id: 'country-fills',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': ['get', 'fill'],
          'fill-opacity': ['case', ['get', 'isPlayer'], 0.9, 0.72],
        },
      });
      map.addLayer({
        id: 'player-glow',
        type: 'line',
        source: 'countries',
        filter: ['get', 'isPlayer'],
        paint: { 'line-color': '#F2A93B', 'line-width': 9, 'line-opacity': 0.35, 'line-blur': 7 },
      });
      map.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': [
            'case',
            ['get', 'selected'], '#ffffff',
            ['get', 'isPlayer'], '#F2A93B',
            ['get', 'enemy'], '#E5383B',
            ['get', 'atWar'], 'rgba(229,56,59,0.75)',
            '#0b0f17',
          ],
          'line-width': [
            'case',
            ['get', 'selected'], 2.5,
            ['get', 'isPlayer'], 2.2,
            ['get', 'enemy'], 2.5,
            ['get', 'atWar'], 1.4,
            0.7,
          ],
        },
      });
      map.addLayer({
        id: 'war-pulse',
        type: 'line',
        source: 'countries',
        filter: ['get', 'enemy'],
        paint: { 'line-color': '#E5383B', 'line-width': 4, 'line-opacity': 0.5, 'line-blur': 3 },
      });
      map.addSource('war-arcs', { type: 'geojson', data: emptyFC() });
      map.addLayer({
        id: 'war-arcs-glow',
        type: 'line',
        source: 'war-arcs',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#ff3b3b', 'line-width': 6, 'line-opacity': 0.18, 'line-blur': 4 },
      });
      map.addLayer({
        id: 'war-arcs',
        type: 'line',
        source: 'war-arcs',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#ff5a4f', 'line-width': 1.8, 'line-dasharray': [0, 4, 3] },
      });
      map.addLayer({
        id: 'war-fronts',
        type: 'circle',
        source: 'war-arcs',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': 'rgba(255,59,59,0.25)',
          'circle-stroke-color': '#ff5a4f',
          'circle-stroke-width': 1.5,
        },
      });
      map.addSource('events', { type: 'geojson', data: emptyFC() });
      for (const n of [0, 1]) {
        map.addLayer({
          id: `event-ripple-${n}`,
          type: 'circle',
          source: 'events',
          paint: {
            'circle-radius': 8,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-pitch-alignment': 'map',
          },
        });
      }
      map.addLayer({
        id: 'event-dots',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': 4,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#0b0f17',
          'circle-stroke-width': 1.5,
        },
      });
      map.addLayer({
        id: 'relation-lines',
        type: 'line',
        source: 'lines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-dasharray': [2, 2],
          'line-opacity': 0.75,
        },
      });
      map.addLayer({
        id: 'country-icons',
        type: 'symbol',
        source: 'icons',
        filter: ['==', ['get', 'kind'], 'icon'],
        layout: {
          'text-field': ['get', 'icon'],
          'text-size': ['get', 'size'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#000',
          'text-halo-width': 1.5,
        },
      });
      map.addLayer({
        id: 'country-labels',
        type: 'symbol',
        source: 'icons',
        filter: ['==', ['get', 'kind'], 'label'],
        layout: {
          'text-field': ['get', 'icon'],
          'text-size': 11,
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#e8ecf2', 'text-halo-color': '#0b0f17', 'text-halo-width': 1.4 },
      });

      // Interactions
      map.on('click', 'country-fills', (e) => {
        const id = e.features?.[0]?.properties?.gameId as string | undefined;
        if (!id) return;
        const current = useGameStore.getState().selectedCountryId;
        selectCountry(current === id ? null : id);
        const center = COUNTRY_CENTERS[id];
        if (center && current !== id) {
          map.flyTo({ center, zoom: Math.max(map.getZoom(), 2.6), speed: 1.2 });
        }
      });
      map.on('mousemove', 'country-fills', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const id = e.features?.[0]?.properties?.gameId as string | undefined;
        if (!id) return;
        const view = useGameStore.getState().playerView.find((c) => c.id === id);
        const wars = useGameStore.getState().worldState?.wars ?? [];
        if (!view) return;
        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: '300px',
            className: 'map-tooltip',
          });
        }
        popupRef.current.setLngLat(e.lngLat).setHTML(buildTooltip(view, wars)).addTo(map);
      });
      map.on('mouseleave', 'country-fills', () => {
        map.getCanvas().style.cursor = '';
        popupRef.current?.remove();
      });

      // War border pulse, marching war arcs and breathing front markers
      const dashes: number[][] = [
        [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5],
        [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
      ];
      let t = 0;
      let step = -1;
      const animate = () => {
        t += 0.05;
        const s = Math.floor(t * 3) % dashes.length;
        if (s !== step && map.getLayer('war-arcs')) {
          step = s;
          map.setPaintProperty('war-arcs', 'line-dasharray', dashes[s]);
        }
        for (const n of [0, 1]) {
          const id = `event-ripple-${n}`;
          if (!map.getLayer(id)) continue;
          const k = (t * 0.35 + n * 0.5) % 1;
          map.setPaintProperty(id, 'circle-radius', 4 + k * 26);
          map.setPaintProperty(id, 'circle-stroke-opacity', (1 - k) * 0.9);
        }
        if (map.getLayer('war-fronts')) {
          const k = (t * 0.6) % 1;
          map.setPaintProperty('war-fronts', 'circle-radius', 5 + k * 14);
          map.setPaintProperty('war-fronts', 'circle-stroke-opacity', 1 - k);
          map.setPaintProperty('war-fronts', 'circle-opacity', 1 - k);
        }
        if (map.getLayer('war-pulse')) {
          map.setPaintProperty('war-pulse', 'line-opacity', 0.25 + Math.abs(Math.sin(t)) * 0.45);
          map.setPaintProperty('war-pulse', 'line-width', 3 + Math.abs(Math.sin(t)) * 4);
        }
        pulseRef.current = requestAnimationFrame(animate);
      };
      pulseRef.current = requestAnimationFrame(animate);

      setMapReady(true);
    });

    return () => {
      cancelAnimationFrame(pulseRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [selectCountry]);

  // Open on the player's own country
  const playerCountryId = worldState?.playerCountryId;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !playerCountryId) return;
    const capital =
      useGameStore.getState().worldState?.countries.find((c) => c.id === playerCountryId)?.capital ??
      COUNTRY_CENTERS[playerCountryId];
    if (capital) {
      map.flyTo({ center: capital, zoom: window.innerWidth < 700 ? 1.9 : 2.4, speed: 0.8 });
    }
  }, [playerCountryId, mapReady]);

  // ------------------------------------------------------------------
  // Data → map sync
  // ------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !mapReady || !worldState || playerView.length === 0) return;

    const byId = new Map(playerView.map((v) => [v.id, v]));
    const playerAtWarWith =
      worldState.countries.find((c) => c.id === worldState.playerCountryId)?.atWarWith ?? [];
    // Anchors: scenario capitals (covers every simulated country), falling back to the table
    for (const c of worldState.countries) {
      if (c.capital && !COUNTRY_CENTERS[c.id]) COUNTRY_CENTERS[c.id] = c.capital;
    }
    const maxStrength = Math.max(...playerView.map((v) => v.militaryStrength.estimate), 1);

    // Country polygons joined with game state
    const features = geo.features
      .filter((f) => byId.has((f.properties as Record<string, unknown>)?.ADM0_A3 as string))
      .map((f) => {
        const id = (f.properties as Record<string, unknown>).ADM0_A3 as string;
        const view = byId.get(id) as PlayerViewCountry;
        const atWar = worldState.wars.some((w) => w.attackerId === id || w.defenderId === id);
        const enemy = playerAtWarWith.includes(id);
        return {
          ...f,
          properties: {
            gameId: id,
            fill: countryColor(view, mapLayer, maxStrength),
            isPlayer: view.isPlayer,
            atWar,
            enemy,
            selected: id === selectedCountryId,
          },
        };
      });
    (map.getSource('countries') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: features as GeoJSON.Feature[],
    });

    // Alliance & war lines for the selected country (or player by default)
    const focusId = selectedCountryId ?? worldState.playerCountryId;
    const focus = byId.get(focusId);
    const lines: GeoJSON.Feature[] = [];
    if (focus && COUNTRY_CENTERS[focusId]) {
      for (const allyId of focus.alliances) {
        if (COUNTRY_CENTERS[allyId]) lines.push(lineFeature(focusId, allyId, '#39c46a', 1.6));
      }
      for (const enemyId of focus.atWarWith) {
        if (COUNTRY_CENTERS[enemyId]) lines.push(lineFeature(focusId, enemyId, '#ff4040', 2.4));
      }
    }
    // Every war on the map as a marching arc, with a pulsing marker at the front
    const arcs: GeoJSON.Feature[] = [];
    for (const w of worldState.wars) {
      const a = COUNTRY_CENTERS[w.attackerId];
      const b = COUNTRY_CENTERS[w.defenderId];
      if (!a || !b) continue;
      const pts = arc(a, b);
      arcs.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} });
      // The front sits along the arc where the frontline stands (50 = halfway)
      const front = pts[Math.round((Math.min(95, Math.max(5, w.frontline)) / 100) * (pts.length - 1))];
      arcs.push({ type: 'Feature', geometry: { type: 'Point', coordinates: front }, properties: {} });
    }
    // This month's news as rippling beacons where it happened
    const CAT_COLOR: Record<string, string> = {
      WAR: '#ff5a4f', NUCLEAR: '#f5d547', COVERT: '#36c5f0', DIPLOMACY: '#4c8dff',
      ECONOMY: '#19c37d', GOVERNMENT: '#b48cff', DOMESTIC: '#ff9f43', WORLD: '#e8ecf2',
    };
    const seen = new Set<string>();
    const beacons: GeoJSON.Feature[] = [];
    for (const n of worldState.newspaper.filter((x) => x.turn === worldState.turn)) {
      const id = n.relatedCountries[0];
      const c = id && COUNTRY_CENTERS[id];
      if (!c || seen.has(id)) continue;
      seen.add(id);
      beacons.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: c },
        properties: { color: CAT_COLOR[n.category] ?? '#e8ecf2' },
      });
    }
    (map.getSource('events') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: beacons,
    });
    (map.getSource('war-arcs') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: arcs,
    });
    (map.getSource('lines') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: lines,
    });

    // Icons: nuclear status, insurgency + name labels
    const icons: GeoJSON.Feature[] = [];
    for (const view of playerView) {
      const center = COUNTRY_CENTERS[view.id];
      if (!center) continue;
      icons.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: { kind: 'label', icon: view.name, size: 11, color: '#e8e8e8' },
      });
      if (view.nuclearStatus === 'ARMED' || view.nuclearStatus === 'TESTED') {
        icons.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [center[0], center[1] + 3] },
          properties: { kind: 'icon', icon: '☢', size: 16, color: '#ffd43b' },
        });
      }
      if (view.insurgencyLevel === 'REBELLION' || view.insurgencyLevel === 'GUERILLA') {
        icons.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [center[0] - 3, center[1] - 2] },
          properties: { kind: 'icon', icon: '🔥', size: 13, color: '#ff922b' },
        });
      }
    }
    (map.getSource('icons') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: icons,
    });
  }, [worldState, playerView, mapLayer, selectedCountryId, mapReady]);

  return (
    <div className="map-container" style={{ position: 'relative', flex: 1 }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      <div className="map-sheen" aria-hidden />

      {/* Layer switcher */}
      <div
        className="layer-bar"
        style={{
          position: 'absolute',
          top: 'calc(var(--under-top, 0px) + 12px)',
          right: 12,
          display: 'flex',
          gap: 4,
          background: 'rgba(13,15,20,0.85)',
          padding: 6,
          borderRadius: 8,
          border: '1px solid #2a2e3a',
          zIndex: 5,
        }}
      >
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => setMapLayer(l.id as 'political')}
            title={l.label}
            style={{
              background: mapLayer === l.id ? 'rgba(242,169,59,0.18)' : 'transparent',
              outline: mapLayer === l.id ? '1px solid #F2A93B' : 'none',
              color: '#eee',
              border: 'none',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {l.icon} <span className="lbl">{l.label}</span>
          </button>
        ))}
        <button
          onClick={() => setShowGuide((v) => !v)}
          title="Map guide: what the colors, icons and lines mean"
          style={{
            background: showGuide ? 'rgba(242,169,59,0.18)' : 'transparent',
            color: '#eee',
            border: '1px solid #3a3e4a',
            borderRadius: 6,
            padding: '4px 9px',
            cursor: 'pointer',
            fontSize: 12,
            marginLeft: 4,
            fontWeight: 700,
          }}
        >
          ℹ Guide
        </button>
      </div>

      {/* Map rubric: colors, icons, interactions */}
      {showGuide && <MapGuide onClose={() => setShowGuide(false)} />}

      {/* Country dossier panel */}
      {selectedCountryId && <CountryDetailPanel />}

      {/* Watermark styling for map credits */}
      <style>{`
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib {
          background: rgba(13, 15, 20, 0.55);
          border-radius: 4px;
          padding: 1px 6px;
        }
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib,
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib a {
          color: rgba(180, 190, 205, 0.45);
          font-size: 10px;
          text-decoration: none;
        }
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib a:hover {
          color: rgba(220, 228, 240, 0.85);
        }
      `}</style>
    </div>
  );
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function lineFeature(fromId: string, toId: string, color: string, width: number): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [COUNTRY_CENTERS[fromId], COUNTRY_CENTERS[toId]],
    },
    properties: { color, width },
  };
}
