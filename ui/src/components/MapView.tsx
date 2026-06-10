import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGameStore } from '../store/gameStore';
import type { PlayerViewCountry, War } from '../store/gameStore';
import { CountryDetailPanel } from './CountryDetailPanel';

// Capital/centroid anchors for labels, icons and relationship lines
export const COUNTRY_CENTERS: Record<string, [number, number]> = {
  USA: [-98.5, 39.8], CHN: [104.1, 35.8], RUS: [60.0, 58.0], DEU: [10.4, 51.1],
  IND: [78.9, 22.0], BRA: [-51.9, -10.0], CAN: [-106.3, 56.1], MEX: [-102.5, 23.6],
  FRA: [2.2, 46.2], GBR: [-1.5, 52.3], POL: [19.1, 51.9], TUR: [35.2, 38.9],
  SAU: [45.0, 23.8], IRN: [53.6, 32.4], ISR: [34.8, 31.0], EGY: [30.8, 26.8],
  JPN: [138.2, 36.2], IDN: [113.9, -0.7], KOR: [127.7, 35.9], PRK: [127.5, 40.3],
  AUS: [133.7, -25.2], PAK: [69.3, 30.3], NGA: [8.6, 9.0], ZAF: [22.9, -30.5],
  ITA: [12.5, 42.8],
};

const REGIME_COLORS: Record<string, string> = {
  DEMOCRACY: '#3a7d44',
  AUTOCRACY: '#a63a3a',
  COMMUNIST: '#b5482e',
  MONARCHY: '#7d5ba6',
  THEOCRACY: '#b07d2b',
  MILITARY_JUNTA: '#6e5849',
};

const LAYERS = [
  { id: 'political', label: 'Political', icon: '🏛' },
  { id: 'military', label: 'Military', icon: '🛡' },
  { id: 'economic', label: 'Economic', icon: '💰' },
  { id: 'stability', label: 'Stability', icon: '⚖' },
  { id: 'intelligence', label: 'Intel', icon: '🕵' },
  { id: 'nuclear', label: 'Nuclear', icon: '☢' },
] as const;

function countryColor(view: PlayerViewCountry, layer: string, maxStrength: number): string {
  switch (layer) {
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
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [{ id: 'base', type: 'raster', source: 'carto' }],
      },
      center: [15, 25],
      zoom: 1.8,
      minZoom: 1.2,
      maxZoom: 7,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    mapRef.current = map;

    map.on('load', async () => {
      const res = await fetch('/world.geojson');
      const geo = (await res.json()) as GeoJSON.FeatureCollection;
      geoRef.current = geo;

      map.addSource('countries', { type: 'geojson', data: emptyFC() });
      map.addSource('lines', { type: 'geojson', data: emptyFC() });
      map.addSource('icons', { type: 'geojson', data: emptyFC() });

      map.addLayer({
        id: 'country-fills',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': ['get', 'fill'],
          'fill-opacity': ['case', ['get', 'isPlayer'], 0.85, 0.62],
        },
      });
      map.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': [
            'case',
            ['get', 'atWar'], '#ff4040',
            ['get', 'selected'], '#ffffff',
            '#0d0f14',
          ],
          'line-width': ['case', ['get', 'atWar'], 2.5, ['get', 'selected'], 2.5, 0.8],
        },
      });
      map.addLayer({
        id: 'war-pulse',
        type: 'line',
        source: 'countries',
        filter: ['get', 'atWar'],
        paint: { 'line-color': '#ff3030', 'line-width': 4, 'line-opacity': 0.5, 'line-blur': 3 },
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
        paint: { 'text-color': '#e8e8e8', 'text-halo-color': '#000', 'text-halo-width': 1.2 },
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

      // War border pulse animation
      let t = 0;
      const animate = () => {
        t += 0.05;
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

  // ------------------------------------------------------------------
  // Data → map sync
  // ------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !mapReady || !worldState || playerView.length === 0) return;

    const byId = new Map(playerView.map((v) => [v.id, v]));
    const maxStrength = Math.max(...playerView.map((v) => v.militaryStrength.estimate), 1);

    // Country polygons joined with game state
    const features = geo.features
      .filter((f) => byId.has((f.properties as Record<string, unknown>)?.ADM0_A3 as string))
      .map((f) => {
        const id = (f.properties as Record<string, unknown>).ADM0_A3 as string;
        const view = byId.get(id) as PlayerViewCountry;
        const atWar = worldState.wars.some((w) => w.attackerId === id || w.defenderId === id);
        return {
          ...f,
          properties: {
            gameId: id,
            fill: countryColor(view, mapLayer, maxStrength),
            isPlayer: view.isPlayer,
            atWar,
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
        properties: { kind: 'label', icon: view.id, size: 11, color: '#e8e8e8' },
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

      {/* Layer switcher */}
      <div
        style={{
          position: 'absolute',
          top: 12,
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
              background: mapLayer === l.id ? '#2a6dd9' : 'transparent',
              color: '#eee',
              border: 'none',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* Country dossier panel */}
      {selectedCountryId && <CountryDetailPanel />}
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
