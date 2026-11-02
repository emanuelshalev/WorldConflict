import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  IconBuildingBank,
  IconEye,
  IconHeartHandshake,
  IconInfoCircle,
  IconRadioactive,
  IconScale,
  IconShield,
  IconCoin,
  type Icon,
} from '@tabler/icons-react';
import { useGameStore } from '../store/gameStore';
import type { PlayerViewCountry, War, WorldState } from '../store/gameStore';
import { CountryDetailPanel } from './CountryDetailPanel';
import { MapGuide } from './MapGuide';
import { MapActionMenu } from './MapActionMenu';
import { REFUGEE_ARROW, UNIT_FOE, UNIT_MINE, addMapImages, orderImage } from './mapIcons';
import { countryPaint } from './mapColors';
import { StateMarkers, buildMarkers, deriveSignals, latestNews, refugeeFlows } from './mapMarkers';
import { FAMILY_COLOR, actionFamily } from '../scenes/actionIcons';
import { frontPoint, loadWorld } from '../scenes/worldGeo';

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

/** A bowed arc between two points (quadratic curve), for war vectors and order arrows. */
function arc(a: [number, number], b: [number, number], bow = 0.18, steps = 24): [number, number][] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const c: [number, number] = [(a[0] + b[0]) / 2 - dy * bow, (a[1] + b[1]) / 2 + dx * bow];
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return pts;
}

// Centroid anchors for labels, icons and lines (scenario capitals fill in the rest)
const COUNTRY_CENTERS: Record<string, [number, number]> = {
  USA: [-98.5, 39.8], CHN: [104.1, 35.8], RUS: [60.0, 58.0], DEU: [10.4, 51.1],
  IND: [78.9, 22.0], BRA: [-51.9, -10.0], CAN: [-106.3, 56.1], MEX: [-102.5, 23.6],
  FRA: [2.2, 46.2], GBR: [-1.5, 52.3], POL: [19.1, 51.9], TUR: [35.2, 38.9],
  SAU: [45.0, 23.8], IRN: [53.6, 32.4], ISR: [34.8, 31.0], EGY: [30.8, 26.8],
  JPN: [138.2, 36.2], IDN: [113.9, -0.7], KOR: [127.7, 35.9], PRK: [127.5, 40.3],
  AUS: [133.7, -25.2], PAK: [69.3, 30.3], NGA: [8.6, 9.0], ZAF: [22.9, -30.5],
  ITA: [12.5, 42.8],
};

const LAYERS: ReadonlyArray<{ id: string; label: string; icon: Icon }> = [
  { id: 'relations', label: 'Relations', icon: IconHeartHandshake },
  { id: 'political', label: 'Regimes', icon: IconBuildingBank },
  { id: 'military', label: 'Military', icon: IconShield },
  { id: 'economic', label: 'Economic', icon: IconCoin },
  { id: 'stability', label: 'Stability', icon: IconScale },
  { id: 'intelligence', label: 'Intel', icon: IconEye },
  { id: 'nuclear', label: 'Nuclear', icon: IconRadioactive },
];

function buildTooltip(view: PlayerViewCountry, wars: War[]): string {
  const fmt = (n: number) =>
    n >= 1e12 ? `$${(n / 1e12).toFixed(1)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(0)}B` : `$${(n / 1e6).toFixed(0)}M`;
  const range = (r: { low: number; high: number; confidence: number }, f: (x: number) => string) =>
    r.confidence > 85 ? f((r.low + r.high) / 2) : `${f(r.low)} - ${f(r.high)}`;
  const atWar = wars.some((w) => w.attackerId === view.id || w.defenderId === view.id);
  const growth = view.growth ?? view.full?.realGrowth;
  const fallout = view.fallout ?? view.full?.fallout ?? 0;
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
      ${growth !== undefined ? `<div style="font-size:12px">Growth: <b style="color:${growth < -0.02 ? '#ff7b6b' : growth > 0.025 ? '#5fd3a8' : '#dfe3ea'}">${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(1)}%/yr</b></div>` : ''}
      ${view.underEmbargo ? '<div style="font-size:12px;color:#c9d2e0">Under embargo</div>' : ''}
      ${fallout > 0 ? `<div style="font-size:12px;color:#d4f03c">Radioactive fallout: ${Math.round(fallout)}/100</div>` : ''}
      ${view.insurgencyLevel !== 'NONE' ? `<div style="font-size:12px;color:#e8a13c">Insurgency: ${view.insurgencyLevel}</div>` : ''}
      ${view.isPlayer ? '' : `<div style="font-size:11px;color:#888;margin-top:4px">Intel confidence: ${Math.round(view.intelConfidence)}%</div>`}
      <div style="font-size:10px;color:#666;margin-top:4px">${view.isPlayer ? 'Click for your dossier' : 'Click for orders & dossier'}</div>
    </div>`;
}

// ----------------------------------------------------------------------------
// Relation changes since last month: remembered per save and month, so a reload
// falls back to what the turn report says the player did.
// ----------------------------------------------------------------------------
const relationMemory = new Map<string, Record<string, number>>();
const REPORT_SIGN: Record<string, number> = {
  DIPLOMACY_IMPROVE_RELATIONS: 1,
  DIPLOMACY_PROPOSE_ALLIANCE: 1,
  DIPLOMACY_PROPOSE_CEASEFIRE: 1,
  DIPLOMACY_DENOUNCE: -1,
  DIPLOMACY_DECLARE_WAR: -1,
  MILITARY_AIRSTRIKE: -1,
  MILITARY_DEPLOY_BORDER: -1,
};

/** id -> { sign, label } for relations that moved by 3+ last month (at most 8, biggest first). */
function relationChanges(world: WorldState, saveId: string | null): Map<string, { sign: number; label: string }> {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  const out = new Map<string, { sign: number; label: string }>();
  if (!me) return out;
  const key = (turn: number) => `${saveId ?? 'local'}:${turn}`;
  relationMemory.set(key(world.turn), { ...me.relations });
  const prev = relationMemory.get(key(world.turn - 1));
  if (prev) {
    Object.entries(me.relations)
      .map(([id, v]) => [id, Math.round(v - (prev[id] ?? v))] as const)
      .filter(([, d]) => Math.abs(d) >= 3)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 8)
      .forEach(([id, d]) => out.set(id, { sign: Math.sign(d), label: `${d > 0 ? '+' : ''}${d}` }));
  } else {
    for (const o of world.turnReport?.orders ?? []) {
      const s = o.type ? REPORT_SIGN[o.type] : 0;
      if (o.ok && o.target && s) out.set(o.target, { sign: s, label: '' });
    }
  }
  return out;
}

const fmtTroops = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

interface MenuState {
  id: string;
  x: number;
  y: number;
  turn: number;
  bounds: { top: number; bottom: number; left: number; right: number };
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const geoRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // What the animation loop needs to animate (skips layers with nothing on them)
  const animRef = useRef({ wars: false, events: false, orders: false, enemy: false, refugees: false, pulse: false, pulseUntil: 0, pulsePending: false });
  const markersRef = useRef<StateMarkers | null>(null);

  const worldState = useGameStore((s) => s.worldState);
  const playerView = useGameStore((s) => s.playerView);
  const pendingActions = useGameStore((s) => s.pendingActions);
  const mapLayer = useGameStore((s) => s.mapLayer);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const showChronicle = useGameStore((s) => s.showChronicle);
  const activeModal = useGameStore((s) => s.activeModal);
  const saveId = useGameStore((s) => s.saveId);
  const setMapLayer = useGameStore((s) => s.setMapLayer);
  const closeMenu = useCallback(() => setMenu(null), []);

  // ------------------------------------------------------------------
  // Map bootstrap
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const canHover = window.matchMedia?.('(hover: hover)').matches ?? true;

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
    if (import.meta.env.DEV) {
      const w = window as unknown as { __wcMap?: maplibregl.Map; __wcStore?: typeof useGameStore };
      w.__wcMap = map;
      // Dev only: lets visual checks inject a world state (e.g. after a nuclear strike)
      w.__wcStore = useGameStore;
    }
    // The canvas extends under the glass HUD and desk (see .map-stage in wc.css): keep the
    // camera centred on the visible part
    map.setPadding({ top: 64, bottom: Math.round(window.innerHeight * 0.6), left: 0, right: 0 });

    let raf = 0;
    let disposed = false;
    map.on('load', async () => {
      const [geo] = await Promise.all([loadWorld(), addMapImages(map).catch(() => undefined)]);
      if (disposed) return;
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
      map.addLayer({ id: 'land-fill', type: 'fill', source: 'land', paint: { 'fill-color': '#1a2233' } });
      map.addLayer({
        id: 'land-borders',
        type: 'line',
        source: 'land',
        paint: { 'line-color': '#2a3448', 'line-width': 0.5 },
      });

      // Simulated countries: feature ids are game ids, so hover/selection use feature-state
      // and never re-upload the polygons
      map.addSource('countries', { type: 'geojson', data: emptyFC(), promoteId: 'gameId' });
      for (const id of ['alliances', 'lines', 'icons', 'war-arcs', 'events', 'orders', 'deploy', 'capitals', 'pulse-labels', 'refugees'])
        map.addSource(id, { type: 'geojson', data: emptyFC() });

      const hovered: maplibregl.ExpressionSpecification = ['boolean', ['feature-state', 'hover'], false];
      const selected: maplibregl.ExpressionSpecification = ['boolean', ['feature-state', 'selected'], false];
      map.addLayer({
        id: 'country-fills',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': ['get', 'fill'],
          'fill-opacity': ['case', hovered, 0.95, ['get', 'isPlayer'], 0.9, 0.72],
          'fill-opacity-transition': { duration: 150 },
        },
      });
      // Special states drawn over the colour: embargo, war, revolt, fallout, nuclear pariah
      map.addLayer({
        id: 'country-hatch',
        type: 'fill',
        source: 'countries',
        filter: ['!=', ['get', 'pattern'], ''],
        paint: { 'fill-pattern': ['get', 'pattern'], 'fill-opacity': 0.85 },
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
            selected, '#ffffff',
            ['get', 'isPlayer'], '#F2A93B',
            ['get', 'enemy'], '#E5383B',
            ['get', 'atWar'], 'rgba(229,56,59,0.75)',
            '#0b0f17',
          ],
          'line-width': [
            'case',
            selected, 2.5,
            ['get', 'isPlayer'], 2.2,
            ['get', 'enemy'], 2.5,
            ['get', 'atWar'], 1.4,
            0.7,
          ],
        },
      });
      map.addLayer({
        id: 'country-hover',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.6,
          'line-opacity': ['case', hovered, 0.85, 0],
          'line-opacity-transition': { duration: 150 },
        },
      });
      map.addLayer({
        id: 'war-pulse',
        type: 'line',
        source: 'countries',
        filter: ['get', 'enemy'],
        paint: { 'line-color': '#E5383B', 'line-width': 4, 'line-opacity': 0.5, 'line-blur': 3 },
      });
      // Relations that moved last month: a short pulse, then a faint outline for the month
      map.addLayer({
        id: 'country-pulse',
        type: 'line',
        source: 'countries',
        filter: ['!=', ['get', 'pulse'], 0],
        paint: {
          'line-color': ['case', ['>', ['get', 'pulse'], 0], '#6fb4ff', '#ff8a3d'],
          'line-width': 2,
          'line-opacity': 0.4,
          'line-blur': 1.5,
        },
      });
      // Pacts as subtle links (yours brighter)
      map.addLayer({
        id: 'alliance-links',
        type: 'line',
        source: 'alliances',
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#7fb2ff',
          'line-width': ['case', ['get', 'mine'], 1.4, 0.9],
          'line-opacity': ['case', ['get', 'mine'], 0.45, 0.12],
        },
      });
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
      for (const n of [0, 1]) {
        map.addLayer({
          id: `event-ripple-${n}`,
          type: 'circle',
          source: 'events',
          paint: {
            'circle-radius': 8 + n * 10,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.5 - n * 0.25,
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
      // Refugee flows: marching chevrons from a struck or losing country into its neighbours
      map.addLayer({
        id: 'refugee-lines',
        type: 'line',
        source: 'refugees',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#c9b6ff', 'line-width': 1.4, 'line-opacity': 0.55, 'line-dasharray': [0, 4, 3] },
      });
      map.addLayer({
        id: 'refugee-arrows',
        type: 'symbol',
        source: 'refugees',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 38,
          'icon-image': REFUGEE_ARROW,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': 0.9,
        },
        paint: { 'icon-opacity': 0.8 },
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
      // Troop deployments: a faint line from the capital to a unit box on the border
      map.addLayer({
        id: 'deploy-lines',
        type: 'line',
        source: 'deploy',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.2, 'line-opacity': 0.45, 'line-dasharray': [1, 2] },
      });
      // This month's queued orders: dashed arrows from you to each target
      map.addLayer({
        id: 'order-arrows-glow',
        type: 'line',
        source: 'orders',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 0.16, 'line-blur': 4 },
      });
      map.addLayer({
        id: 'order-arrows',
        type: 'line',
        source: 'orders',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [0, 4, 3] },
      });
      map.addLayer({
        id: 'capital-dots',
        type: 'circle',
        source: 'capitals',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.2, ['case', ['get', 'mine'], 2.6, 1.6], 5, ['case', ['get', 'mine'], 4.5, 3.2]],
          'circle-color': ['case', ['get', 'mine'], '#F2A93B', '#dfe6f0'],
          'circle-stroke-color': '#0b0f17',
          'circle-stroke-width': 1,
          'circle-opacity': 0.9,
        },
      });
      map.addLayer({
        id: 'deploy-units',
        type: 'symbol',
        source: 'deploy',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'icon-image': ['get', 'img'],
          'icon-allow-overlap': true,
          'icon-offset': ['get', 'offset'],
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-offset': ['get', 'textOffset'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#05080f', 'text-halo-width': 1.4 },
      });
      map.addLayer({
        id: 'country-icons',
        type: 'symbol',
        source: 'icons',
        filter: ['==', ['get', 'kind'], 'icon'],
        layout: { 'icon-image': ['get', 'img'], 'icon-allow-overlap': true, 'icon-size': 0.95 },
      });
      map.addLayer({
        id: 'country-labels',
        type: 'symbol',
        source: 'icons',
        filter: ['==', ['get', 'kind'], 'label'],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1.2, 10, 4, 13],
          'text-allow-overlap': false,
          'text-offset': [0, 0.5],
          'text-anchor': 'top',
        },
        paint: { 'text-color': '#e8ecf2', 'text-halo-color': '#0b0f17', 'text-halo-width': 1.4 },
      });
      map.addLayer({
        id: 'pulse-labels',
        type: 'symbol',
        source: 'pulse-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, -1.1],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': ['case', ['>', ['get', 'sign'], 0], '#8cc4ff', '#ffa46b'],
          'text-halo-color': '#05080f',
          'text-halo-width': 1.6,
          'text-opacity': 0.85,
        },
      });
      map.addLayer({
        id: 'order-heads',
        type: 'symbol',
        source: 'orders',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'icon-image': ['get', 'img'],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-offset': ['get', 'offset'],
        },
      });

      // ---------------------------------------------------------------
      // Interactions
      // ---------------------------------------------------------------
      let hoverId: string | null = null;
      const setHover = (id: string | null) => {
        if (id === hoverId) return;
        if (hoverId) map.setFeatureState({ source: 'countries', id: hoverId }, { hover: false });
        hoverId = id;
        if (id) map.setFeatureState({ source: 'countries', id }, { hover: true });
      };
      map.on('mousemove', 'country-fills', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const id = e.features?.[0]?.properties?.gameId as string | undefined;
        if (!id) return;
        const changed = id !== hoverId;
        setHover(id);
        if (!canHover) return;
        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: '300px',
            className: 'map-tooltip',
            offset: 14,
          });
        }
        if (changed || !popupRef.current.isOpen()) {
          const s = useGameStore.getState();
          const view = s.playerView.find((c) => c.id === id);
          if (!view) return;
          popupRef.current.setHTML(buildTooltip(view, s.worldState?.wars ?? []));
          if (!popupRef.current.isOpen()) popupRef.current.addTo(map);
        }
        popupRef.current.setLngLat(e.lngLat);
      });
      map.on('mouseleave', 'country-fills', () => {
        map.getCanvas().style.cursor = '';
        setHover(null);
        popupRef.current?.remove();
      });
      // A foreign country opens the order menu at the click; your own opens your dossier
      map.on('click', (e) => {
        const id = map.queryRenderedFeatures(e.point, { layers: ['country-fills'] })[0]?.properties?.gameId as
          | string
          | undefined;
        popupRef.current?.remove();
        const s = useGameStore.getState();
        if (!id || !s.worldState) {
          setMenu(null);
          return;
        }
        if (id === s.worldState.playerCountryId || s.gameOver) {
          setMenu(null);
          s.selectCountry(s.selectedCountryId === id ? null : id);
          return;
        }
        const box = map.getContainer().getBoundingClientRect();
        const stage = map.getContainer().parentElement?.parentElement?.getBoundingClientRect() ?? box;
        const turn = s.worldState.turn;
        setMenu((m) =>
          m?.id === id
            ? null
            : {
                id,
                x: e.point.x,
                y: e.point.y,
                turn,
                bounds: {
                  // below the layer bar
                  top: Math.max(0, stage.top - box.top) + 52,
                  bottom: Math.min(box.height, stage.bottom - box.top),
                  left: 0,
                  right: box.width,
                },
              },
        );
      });
      // A drag or pinch puts the menu away (camera moves we start ourselves don't)
      map.on('movestart', (e) => {
        if ((e as { originalEvent?: Event }).originalEvent) setMenu(null);
      });

      // ---------------------------------------------------------------
      // One animation loop: paint updates throttled to ~20 fps, only for layers with content
      // ---------------------------------------------------------------
      const dashes: number[][] = [
        [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5],
        [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
      ];
      const a = animRef.current;
      let last = 0;
      let step = -1;
      let pulseSettled = true;
      const settlePulse = () => {
        map.setPaintProperty('country-pulse', 'line-opacity', 0.4);
        map.setPaintProperty('country-pulse', 'line-width', 2);
        map.setPaintProperty('pulse-labels', 'text-opacity', 0.85);
      };
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (now - last < 50) return;
        last = now;
        const t = now / 1000;
        const s = Math.floor(t * 9) % dashes.length;
        if (s !== step) {
          step = s;
          if (a.wars) map.setPaintProperty('war-arcs', 'line-dasharray', dashes[s]);
          if (a.orders) map.setPaintProperty('order-arrows', 'line-dasharray', dashes[s]);
          if (a.refugees) map.setPaintProperty('refugee-lines', 'line-dasharray', dashes[s]);
        }
        if (a.events) {
          for (const n of [0, 1]) {
            const k = (t * 0.35 + n * 0.5) % 1;
            map.setPaintProperty(`event-ripple-${n}`, 'circle-radius', 4 + k * 26);
            map.setPaintProperty(`event-ripple-${n}`, 'circle-stroke-opacity', (1 - k) * 0.9);
          }
        }
        if (a.wars) {
          const k = (t * 0.6) % 1;
          map.setPaintProperty('war-fronts', 'circle-radius', 5 + k * 14);
          map.setPaintProperty('war-fronts', 'circle-stroke-opacity', 1 - k);
          map.setPaintProperty('war-fronts', 'circle-opacity', 1 - k);
        }
        if (a.enemy) {
          const k = Math.abs(Math.sin(t * 3));
          map.setPaintProperty('war-pulse', 'line-opacity', 0.25 + k * 0.45);
          map.setPaintProperty('war-pulse', 'line-width', 3 + k * 4);
        }
        if (a.pulse && now < a.pulseUntil) {
          pulseSettled = false;
          const k = Math.abs(Math.sin(t * 3.4));
          map.setPaintProperty('country-pulse', 'line-opacity', 0.3 + k * 0.7);
          map.setPaintProperty('country-pulse', 'line-width', 2 + k * 5);
          map.setPaintProperty('pulse-labels', 'text-opacity', 0.5 + k * 0.5);
        } else if (!pulseSettled) {
          pulseSettled = true;
          settlePulse();
        }
      };
      if (!reduced) raf = requestAnimationFrame(frame);

      // Animated state markers (HTML + CSS keyframes); they scale with the zoom through CSS vars
      markersRef.current = new StateMarkers(map, (id) => {
        const st = useGameStore.getState();
        st.selectCountry(st.selectedCountryId === id ? null : id);
      });
      const host = map.getContainer();
      const onZoom = () => {
        const z = map.getZoom();
        host.style.setProperty('--wcm-ppd', `${((512 * 2 ** z) / 360).toFixed(2)}px`);
        host.dataset.wcmZoom = z < 1.7 ? 'far' : z < 3 ? 'mid' : 'near';
      };
      onZoom();
      map.on('zoom', onZoom);

      setMapReady(true);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      markersRef.current?.clear();
      markersRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
  // Data -> map sync, split so each source is uploaded only when its data changes
  // ------------------------------------------------------------------

  // 1. Country polygons (the big upload): world, intel picture or layer changed
  useEffect(() => {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !mapReady || !worldState || playerView.length === 0) return;
    const byId = new Map(playerView.map((v) => [v.id, v]));
    const playerAtWarWith =
      worldState.countries.find((c) => c.id === worldState.playerCountryId)?.atWarWith ?? [];
    for (const c of worldState.countries) {
      if (c.capital && !COUNTRY_CENTERS[c.id]) COUNTRY_CENTERS[c.id] = c.capital;
    }
    const maxStrength = Math.max(...playerView.map((v) => v.militaryStrength.estimate), 1);
    const { nukeUsers } = deriveSignals(worldState, playerView);
    const ctx = { maxStrength, nukeUsers };
    const changes = relationChanges(worldState, saveId);
    const features = geo.features
      .filter((f) => byId.has((f.properties as Record<string, unknown>)?.ADM0_A3 as string))
      .map((f) => {
        const id = (f.properties as Record<string, unknown>).ADM0_A3 as string;
        const view = byId.get(id) as PlayerViewCountry;
        const paint = countryPaint(view, mapLayer, ctx);
        return {
          ...f,
          properties: {
            gameId: id,
            fill: paint.fill,
            pattern: paint.pattern,
            isPlayer: view.isPlayer,
            atWar: worldState.wars.some((w) => w.attackerId === id || w.defenderId === id),
            enemy: playerAtWarWith.includes(id),
            pulse: changes.get(id)?.sign ?? 0,
          },
        };
      });
    (map.getSource('countries') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: features as GeoJSON.Feature[],
    });
    const labels: GeoJSON.Feature[] = [];
    for (const [id, c] of changes) {
      const at = COUNTRY_CENTERS[id];
      if (at && c.label) labels.push(point(at, { label: c.label, sign: c.sign }));
    }
    (map.getSource('pulse-labels') as maplibregl.GeoJSONSource | undefined)?.setData(fc(labels));
    const a = animRef.current;
    a.enemy = playerAtWarWith.length > 0;
    a.pulse = changes.size > 0;
    a.pulsePending = changes.size > 0;
  }, [worldState, playerView, mapLayer, mapReady, saveId]);

  // 2. Pulse once the map is actually visible (after the Chronicle and any modal close)
  const turn = worldState?.turn;
  useEffect(() => {
    const a = animRef.current;
    if (!mapReady || showChronicle || activeModal || !a.pulsePending) return;
    a.pulsePending = false;
    a.pulseUntil = performance.now() + 5200;
  }, [turn, mapReady, showChronicle, activeModal]);

  // Markers that happened this month (strike flash, new war, coup badge) animate once the map
  // is in view: restart their CSS animations by re-adding the class on the map container
  useEffect(() => {
    const host = mapRef.current?.getContainer();
    if (!host || !mapReady || showChronicle || activeModal) return;
    host.classList.remove('wcm-live');
    void host.offsetWidth;
    host.classList.add('wcm-live');
  }, [turn, mapReady, showChronicle, activeModal]);

  // 3. Selection: feature-state outline, the selected country's pacts and wars, fly to it
  const prevSelected = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !worldState) return;
    if (prevSelected.current && map.getSource('countries'))
      map.setFeatureState({ source: 'countries', id: prevSelected.current }, { selected: false });
    if (selectedCountryId) map.setFeatureState({ source: 'countries', id: selectedCountryId }, { selected: true });
    prevSelected.current = selectedCountryId;

    const focusId = selectedCountryId ?? worldState.playerCountryId;
    const focus = playerView.find((v) => v.id === focusId);
    const lines: GeoJSON.Feature[] = [];
    if (focus && COUNTRY_CENTERS[focusId]) {
      for (const allyId of focus.alliances) {
        if (COUNTRY_CENTERS[allyId]) lines.push(lineFeature(focusId, allyId, '#39c46a', 1.6));
      }
      for (const enemyId of focus.atWarWith) {
        if (COUNTRY_CENTERS[enemyId]) lines.push(lineFeature(focusId, enemyId, '#ff4040', 2.4));
      }
    }
    (map.getSource('lines') as maplibregl.GeoJSONSource | undefined)?.setData(fc(lines));
  }, [selectedCountryId, worldState, playerView, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedCountryId) return;
    const center = COUNTRY_CENTERS[selectedCountryId];
    if (center) map.flyTo({ center, zoom: Math.max(map.getZoom(), 2.6), speed: 1.1, curve: 1.3 });
  }, [selectedCountryId, mapReady]);

  // 4. The state of the world as map elements: wars, news, pacts, troops, capitals, status icons
  useEffect(() => {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !mapReady || !worldState || playerView.length === 0) return;
    for (const c of worldState.countries) {
      if (c.capital && !COUNTRY_CENTERS[c.id]) COUNTRY_CENTERS[c.id] = c.capital;
    }
    const me = worldState.playerCountryId;
    const capitalOf = (id: string) => worldState.countries.find((c) => c.id === id)?.capital ?? COUNTRY_CENTERS[id];

    // Every war as a marching arc, with a pulsing marker where the front stands
    const arcs: GeoJSON.Feature[] = [];
    const fronts: Array<[number, number] | null> = [];
    for (const w of worldState.wars) {
      const a = COUNTRY_CENTERS[w.attackerId];
      const b = COUNTRY_CENTERS[w.defenderId];
      if (!a || !b) {
        fronts.push(null);
        continue;
      }
      const pts = arc(a, b);
      arcs.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} });
      const front = pts[Math.round((Math.min(95, Math.max(5, w.frontline)) / 100) * (pts.length - 1))];
      fronts.push(front);
      arcs.push(point(front, {}));
    }
    // This month's news as rippling beacons where it happened
    const CAT_COLOR: Record<string, string> = {
      WAR: '#ff5a4f', NUCLEAR: '#f5d547', COVERT: '#36c5f0', DIPLOMACY: '#4c8dff',
      ECONOMY: '#19c37d', GOVERNMENT: '#b48cff', DOMESTIC: '#ff9f43', WORLD: '#e8ecf2',
    };
    const seen = new Set<string>();
    const beacons: GeoJSON.Feature[] = [];
    for (const n of latestNews(worldState)) {
      const id = n.relatedCountries[0];
      const c = id && COUNTRY_CENTERS[id];
      if (!c || seen.has(id)) continue;
      seen.add(id);
      beacons.push(point(c, { color: CAT_COLOR[n.category] ?? '#e8ecf2' }));
    }
    // Pacts as subtle links, each pair once (the focus country's are drawn by the lines layer)
    const pacts: GeoJSON.Feature[] = [];
    const pairSeen = new Set<string>();
    for (const v of playerView) {
      for (const ally of v.alliances) {
        const key = [v.id, ally].sort().join('-');
        const a = COUNTRY_CENTERS[v.id];
        const b = COUNTRY_CENTERS[ally];
        if (pairSeen.has(key) || !a || !b) continue;
        pairSeen.add(key);
        pacts.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: arc(a, b, 0.08, 16) },
          properties: { mine: v.id === me || ally === me },
        });
      }
    }
    // Troops on the border: yours (full knowledge) and foreign forces massed against you
    // (the only foreign deployments the server reveals)
    const deploy: GeoJSON.Feature[] = [];
    for (const c of worldState.countries) {
      for (const d of c.borderDeployments ?? []) {
        if (c.id !== me && d.targetCountryId !== me) continue;
        const front = frontPoint(geo, c.id, d.targetCountryId);
        const from = capitalOf(c.id);
        if (!front) continue;
        // Step back onto the deployer's side so opposing forces on one border don't overlap
        const gap = from ? Math.hypot(from[0] - front[0], from[1] - front[1]) : 0;
        const k = gap > 0 ? Math.min(0.35, 1.3 / gap) : 0;
        const at: [number, number] = from ? [front[0] + (from[0] - front[0]) * k, front[1] + (from[1] - front[1]) * k] : front;
        const mine = c.id === me;
        const color = mine ? '#f2a93b' : '#ff5a4f';
        if (from) deploy.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [from, at] }, properties: { color } });
        // Forces facing each other on one border sit side by side, yours on the left
        const facing = worldState.countries
          .find((x) => x.id === d.targetCountryId)
          ?.borderDeployments?.some((r) => r.targetCountryId === c.id);
        const dx = facing ? (mine ? -17 : 17) : 0;
        deploy.push(
          point(at, {
            img: mine ? UNIT_MINE : UNIT_FOE,
            label: fmtTroops(d.troops),
            color,
            offset: [dx, 0],
            textOffset: [dx / 10, 1.35],
          }),
        );
      }
    }
    // Capitals as small dots; labels, nuclear and insurgency badges at the anchors
    const capitals: GeoJSON.Feature[] = [];
    const icons: GeoJSON.Feature[] = [];
    for (const view of playerView) {
      const cap = capitalOf(view.id);
      if (cap) capitals.push(point(cap, { mine: view.id === me }));
      const center = COUNTRY_CENTERS[view.id];
      if (!center) continue;
      icons.push(point(center, { kind: 'label', name: view.name }));
    }
    // Status badges, strike sites, war fronts and refugees as animated HTML markers
    const sig = deriveSignals(worldState, playerView);
    markersRef.current?.sync(
      buildMarkers({ world: worldState, view: playerView, sig, layer: mapLayer, centers: COUNTRY_CENTERS, frontOf: (i) => fronts[i] ?? null }),
    );
    const flows: GeoJSON.Feature[] = [];
    for (const f of refugeeFlows({ world: worldState, sig, centers: COUNTRY_CENTERS })) {
      const a = COUNTRY_CENTERS[f.from];
      const b = COUNTRY_CENTERS[f.to];
      if (a && b) flows.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: arc(a, b, 0.12, 16) }, properties: {} });
    }
    const set = (id: string, features: GeoJSON.Feature[]) =>
      (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(fc(features));
    set('war-arcs', arcs);
    set('events', beacons);
    set('alliances', pacts);
    set('deploy', deploy);
    set('capitals', capitals);
    set('icons', icons);
    set('refugees', flows);
    animRef.current.wars = worldState.wars.length > 0;
    animRef.current.events = beacons.length > 0;
    animRef.current.refugees = flows.length > 0;
  }, [worldState, playerView, mapReady, mapLayer]);

  // 5. Orders queued this month: dashed arrows from you to each target, the order's icon at the head
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !playerCountryId) return;
    const from = COUNTRY_CENTERS[playerCountryId];
    const features: GeoJSON.Feature[] = [];
    if (from) {
      const perTarget = new Map<string, number>();
      let home = 0;
      for (const a of pendingActions) {
        const color = FAMILY_COLOR[actionFamily(a.type)];
        const img = orderImage(a.type);
        const to = a.targetCountryId ? COUNTRY_CENTERS[a.targetCountryId] : undefined;
        if (!a.targetCountryId || !to || a.targetCountryId === playerCountryId) {
          // Orders at home sit in a row above your country
          features.push(point(from, { img, offset: [home * 30 - 15 * Math.min(3, pendingActions.length - 1), -34] }));
          home++;
          continue;
        }
        const k = perTarget.get(a.targetCountryId) ?? 0;
        perTarget.set(a.targetCountryId, k + 1);
        const pts = arc(from, to, 0.14 + k * 0.09, 32);
        // Stop short of the target's centre so the head sits on its side of the line
        const end = Math.round(pts.length * (0.9 - k * 0.1));
        features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts.slice(0, end) }, properties: { color } });
        features.push(point(pts[end - 1], { img, offset: [0, 0] }));
      }
    }
    (map.getSource('orders') as maplibregl.GeoJSONSource | undefined)?.setData(fc(features));
    animRef.current.orders = features.some((f) => f.geometry.type === 'LineString');
  }, [pendingActions, playerCountryId, mapReady]);

  const menuOpen = menu && worldState && menu.turn === worldState.turn && !worldState.gameOver;

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
            aria-pressed={mapLayer === l.id}
            style={{
              background: mapLayer === l.id ? 'rgba(242,169,59,0.18)' : 'transparent',
              outline: mapLayer === l.id ? '1px solid #F2A93B' : 'none',
              color: '#eee',
              border: 'none',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <l.icon size={14} stroke={1.8} aria-hidden /> <span className="lbl">{l.label}</span>
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <IconInfoCircle size={14} stroke={1.8} aria-hidden /> Guide
        </button>
      </div>

      {/* Map rubric: colors, icons, interactions */}
      {showGuide && <MapGuide onClose={() => setShowGuide(false)} />}

      {/* Orders straight from the map */}
      {menuOpen && (
        <MapActionMenu
          key={menu.id}
          countryId={menu.id}
          x={menu.x}
          y={menu.y}
          bounds={menu.bounds}
          onClose={closeMenu}
        />
      )}

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

function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features };
}

function point(coordinates: [number, number], properties: Record<string, unknown>): GeoJSON.Feature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates }, properties };
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
