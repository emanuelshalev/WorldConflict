import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGameStore } from '../store/gameStore';
import { getStabilityLevel, getStabilityLabel, getInsurgencyIcon, getFogOpacity } from '../utils/gameHelpers';

const REGIME_COLORS: Record<string, string> = {
  DEMOCRACY: '#4CAF50',
  AUTOCRACY: '#F44336',
  COMMUNIST: '#E91E63',
  MONARCHY: '#9C27B0',
  THEOCRACY: '#FF9800',
};

const COUNTRY_CENTERS: Record<string, [number, number]> = {
  USA: [-98.5, 39.8],
  CHN: [104.2, 35.9],
  RUS: [105.3, 61.5],
  DEU: [10.5, 51.2],
  IND: [78.9, 20.6],
  GBR: [-3.4, 55.4],
  FRA: [2.2, 46.2],
  JPN: [138.3, 36.2],
  BRA: [-51.9, -14.2],
  CAN: [-106.3, 56.1],
  AUS: [133.8, -25.3],
  KOR: [127.8, 35.9],
  MEX: [-102.5, 23.6],
  IDN: [113.9, -0.8],
  TUR: [35.2, 38.9],
  SAU: [45.1, 23.9],
  IRN: [53.7, 32.4],
  ISR: [34.9, 31.0],
  EGY: [30.8, 26.8],
  PAK: [69.3, 30.4],
  POL: [19.1, 51.9],
  ITA: [12.6, 41.9],
  NGA: [8.7, 9.1],
  ZAF: [22.9, -30.6],
  PRK: [127.5, 40.3],
};

// Demo data for opening screen
const DEMO_COUNTRIES = [
  { id: 'USA', iso3: 'USA', name: 'United States', regimeType: 'DEMOCRACY', gdp: 25e12, manpower: 1400000, stability: 75 },
  { id: 'CHN', iso3: 'CHN', name: 'China', regimeType: 'COMMUNIST', gdp: 18e12, manpower: 2000000, stability: 80 },
  { id: 'RUS', iso3: 'RUS', name: 'Russia', regimeType: 'AUTOCRACY', gdp: 2e12, manpower: 900000, stability: 65 },
  { id: 'DEU', iso3: 'DEU', name: 'Germany', regimeType: 'DEMOCRACY', gdp: 4e12, manpower: 180000, stability: 85 },
  { id: 'IND', iso3: 'IND', name: 'India', regimeType: 'DEMOCRACY', gdp: 3.5e12, manpower: 1400000, stability: 70 },
  { id: 'GBR', iso3: 'GBR', name: 'United Kingdom', regimeType: 'DEMOCRACY', gdp: 3e12, manpower: 150000, stability: 80 },
  { id: 'FRA', iso3: 'FRA', name: 'France', regimeType: 'DEMOCRACY', gdp: 2.8e12, manpower: 200000, stability: 75 },
  { id: 'JPN', iso3: 'JPN', name: 'Japan', regimeType: 'DEMOCRACY', gdp: 4.2e12, manpower: 250000, stability: 90 },
  { id: 'BRA', iso3: 'BRA', name: 'Brazil', regimeType: 'DEMOCRACY', gdp: 2e12, manpower: 360000, stability: 60 },
  { id: 'SAU', iso3: 'SAU', name: 'Saudi Arabia', regimeType: 'MONARCHY', gdp: 1e12, manpower: 250000, stability: 75 },
  { id: 'IRN', iso3: 'IRN', name: 'Iran', regimeType: 'THEOCRACY', gdp: 0.4e12, manpower: 600000, stability: 55 },
  { id: 'PRK', iso3: 'PRK', name: 'North Korea', regimeType: 'AUTOCRACY', gdp: 0.03e12, manpower: 1200000, stability: 70 },
];

// Helper to format large numbers
function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toString();
}

// Get color based on layer type
function getLayerColor(country: typeof DEMO_COUNTRIES[0], layer: string, isPlayer: boolean, intelLevel?: number): string {
  switch (layer) {
    case 'military': {
      const strength = Math.min(100, (country.manpower / 2000000) * 100);
      return `hsl(0, ${Math.round(strength)}%, ${40 + strength * 0.2}%)`;
    }
    case 'economic': {
      const gdpScale = Math.min(100, (country.gdp / 25e12) * 100);
      return `hsl(120, ${Math.round(gdpScale)}%, ${30 + gdpScale * 0.2}%)`;
    }
    case 'stability': {
      const hue = country.stability * 1.2; // 0=red, 120=green
      return `hsl(${Math.round(hue)}, 70%, 45%)`;
    }
    case 'intelligence': {
      // Fog-of-information: opacity based on intel level
      const opacity = isPlayer ? 1.0 : getFogOpacity(intelLevel ?? 50, isPlayer);
      return isPlayer ? '#2196F3' : `rgba(100, 100, 100, ${opacity})`;
    }
    default: // political
      return REGIME_COLORS[country.regimeType] || '#607D8B';
  }
}

// Get label based on layer type
function getLayerLabel(country: typeof DEMO_COUNTRIES[0], layer: string): string {
  switch (layer) {
    case 'military':
      return formatNumber(country.manpower);
    case 'economic':
      return formatNumber(country.gdp);
    case 'stability':
      return `${country.stability}%`;
    case 'intelligence':
      return country.iso3;
    default: // political
      return country.iso3;
  }
}

// Store country data for tooltip lookup (GeoJSON serializes properties)
const countryDataMap = new Map<string, typeof DEMO_COUNTRIES[0]>();

// Build GeoJSON for alliance and war connection lines
function buildConnectionLines(countries: any[], _playerCountryId?: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const processedPairs = new Set<string>();

  for (const country of countries) {
    const countryCenter = COUNTRY_CENTERS[country.id];
    if (!countryCenter) continue;

    // Alliance lines (green)
    if (country.alliances) {
      for (const allyId of country.alliances) {
        const pairKey = [country.id, allyId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const allyCenter = COUNTRY_CENTERS[allyId];
        if (!allyCenter) continue;

        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [countryCenter, allyCenter],
          },
          properties: {
            type: 'alliance',
            color: '#4caf50',
            width: 2,
          },
        });
      }
    }

    // War lines (red)
    if (country.atWarWith) {
      for (const enemyId of country.atWarWith) {
        const pairKey = [country.id, enemyId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const enemyCenter = COUNTRY_CENTERS[enemyId];
        if (!enemyCenter) continue;

        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [countryCenter, enemyCenter],
          },
          properties: {
            type: 'war',
            color: '#f44336',
            width: 3,
          },
        });
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const mapLoaded = useRef(false);
  const isDemoRef = useRef(true);

  const { worldState, selectedCountryId, selectCountry, mapLayer, debugMode } = useGameStore();
  
  // Keep ref in sync for use in event handlers
  isDemoRef.current = !worldState;

  // Build GeoJSON for connection lines (alliances and wars)
  const buildConnectionGeoJSON = useCallback(() => {
    const countries = worldState?.countries ?? [];
    return buildConnectionLines(countries, worldState?.playerCountryId);
  }, [worldState]);

  // Build GeoJSON from country data
  const buildGeoJSON = useCallback(() => {
    const countries = worldState?.countries ?? DEMO_COUNTRIES;
    const isDemo = !worldState;
    const playerCountryId = worldState?.playerCountryId;
    const playerCountry = countries.find(c => c.id === playerCountryId);
    const playerIntelLevel = (playerCountry as any)?.intelLevel ?? 50;

    // Clear and rebuild lookup map for tooltips
    countryDataMap.clear();

    const features = countries.map((country) => {
      const center = COUNTRY_CENTERS[country.id];
      if (!center) return null;

      // Store in lookup map for tooltip access
      countryDataMap.set(country.id, country as typeof DEMO_COUNTRIES[0]);

      const isPlayer = !isDemo && country.id === playerCountryId;
      const color = getLayerColor(country, mapLayer, isPlayer, playerIntelLevel);
      const label = getLayerLabel(country, mapLayer);
      
      // Calculate circle size based on layer
      let radius = 12;
      if (mapLayer === 'military') {
        radius = 8 + Math.log10(country.manpower + 1) * 2;
      } else if (mapLayer === 'economic') {
        radius = 8 + Math.log10(country.gdp / 1e9 + 1) * 2;
      }
      if (isPlayer) radius += 4;

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: center,
        },
        properties: {
          id: country.id,
          name: country.name,
          iso3: country.iso3,
          color,
          label,
          radius,
          isPlayer,
          stability: country.stability,
          gdp: country.gdp,
          manpower: country.manpower,
          regimeType: country.regimeType,
          isDemo,
        },
      };
    }).filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      type: 'FeatureCollection' as const,
      features,
    } as GeoJSON.FeatureCollection;
  }, [worldState, mapLayer]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [0, 30],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Create popup for hover
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    });

    map.current.on('load', () => {
      mapLoaded.current = true;
      
      // Add GeoJSON source for connection lines (alliances and wars)
      map.current!.addSource('connections', {
        type: 'geojson',
        data: buildConnectionGeoJSON(),
      });

      // Add alliance lines layer (green, dashed)
      map.current!.addLayer({
        id: 'alliance-lines',
        type: 'line',
        source: 'connections',
        filter: ['==', ['get', 'type'], 'alliance'],
        paint: {
          'line-color': '#4caf50',
          'line-width': 2,
          'line-dasharray': [4, 2],
          'line-opacity': 0.7,
        },
      });

      // Add war lines layer (red, solid, animated)
      map.current!.addLayer({
        id: 'war-lines',
        type: 'line',
        source: 'connections',
        filter: ['==', ['get', 'type'], 'war'],
        paint: {
          'line-color': '#f44336',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      });

      // Add GeoJSON source
      map.current!.addSource('countries', {
        type: 'geojson',
        data: buildGeoJSON(),
      });

      // Add circle layer for country markers
      map.current!.addLayer({
        id: 'country-circles',
        type: 'circle',
        source: 'countries',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': [
            'case',
            ['get', 'isPlayer'], 3,
            ['==', ['get', 'id'], selectedCountryId || ''], 2,
            1
          ],
          'circle-stroke-color': [
            'case',
            ['get', 'isPlayer'], '#FFD700',
            ['==', ['get', 'id'], selectedCountryId || ''], '#FFFFFF',
            'rgba(0,0,0,0.3)'
          ],
        },
      });

      // Add text labels
      map.current!.addLayer({
        id: 'country-labels',
        type: 'symbol',
        source: 'countries',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      });

      // Click handler
      map.current!.on('click', 'country-circles', (e) => {
        if (e.features && e.features[0]) {
          const id = e.features[0].properties?.id;
          selectCountry(id === selectedCountryId ? null : id);
        }
      });

      // Hover handlers
      map.current!.on('mouseenter', 'country-circles', (e) => {
        if (!map.current || !popup.current) return;
        map.current.getCanvas().style.cursor = 'pointer';
        
        if (e.features && e.features[0]) {
          const props = e.features[0].properties || {};
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
          
          // Use lookup map instead of serialized GeoJSON properties
          const countryId = String(props.id || '');
          const countryData = countryDataMap.get(countryId);
          
          if (countryData) {
            const stabilityLevel = getStabilityLevel(countryData.stability);
            const stabilityLabel = getStabilityLabel(stabilityLevel);
            const insurgencyIcon = getInsurgencyIcon((countryData as any).insurgencyLevel ?? 'NONE');
            const atWar = (countryData as any).atWarWith?.length > 0;
            const allianceCount = (countryData as any).alliances?.length ?? 0;
            
            const tooltipHtml = `
              <div style="padding: 8px; font-family: sans-serif; font-size: 13px; color: #333;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${countryData.name}</div>
                <div>Stability: ${stabilityLabel} (${countryData.stability}%) ${insurgencyIcon}</div>
                <div>GDP: ${formatNumber(countryData.gdp)}</div>
                <div>Military: ${formatNumber(countryData.manpower)}</div>
                ${atWar ? '<div style="color: #f44336;">⚔️ AT WAR</div>' : ''}
                ${allianceCount > 0 ? `<div style="color: #4caf50;">🤝 ${allianceCount} Alliance${allianceCount > 1 ? 's' : ''}</div>` : ''}
                ${isDemoRef.current ? '<div style="font-style: italic; margin-top: 4px; color: #666;">(Demo - Start a game)</div>' : ''}
              </div>
            `;
            popup.current.setLngLat(coords).setHTML(tooltipHtml).addTo(map.current);
          }
        }
      });

      map.current!.on('mouseleave', 'country-circles', () => {
        if (!map.current || !popup.current) return;
        map.current.getCanvas().style.cursor = '';
        popup.current.remove();
      });
    });

    return () => {
      popup.current?.remove();
      map.current?.remove();
      map.current = null;
      mapLoaded.current = false;
    };
  }, []);

  // Update GeoJSON when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded.current) return;

    // Update connection lines (alliances and wars)
    const connectionsSource = map.current.getSource('connections') as maplibregl.GeoJSONSource;
    if (connectionsSource) {
      connectionsSource.setData(buildConnectionGeoJSON());
    }

    // Update country markers
    const source = map.current.getSource('countries') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(buildGeoJSON());
    }

    // Update selection styling
    if (map.current.getLayer('country-circles')) {
      map.current.setPaintProperty('country-circles', 'circle-stroke-width', [
        'case',
        ['get', 'isPlayer'], 3,
        ['==', ['get', 'id'], selectedCountryId || ''], 2,
        1
      ]);
      map.current.setPaintProperty('country-circles', 'circle-stroke-color', [
        'case',
        ['get', 'isPlayer'], '#FFD700',
        ['==', ['get', 'id'], selectedCountryId || ''], '#FFFFFF',
        'rgba(0,0,0,0.3)'
      ]);
    }
  }, [worldState, selectedCountryId, mapLayer, buildGeoJSON, buildConnectionGeoJSON]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />

      <div className="map-controls">
        <div className="layer-selector">
          <div className="layer-info" title="Map Layers: Change how countries are colored on the map. Political shows regime types, Military shows army strength, Economic shows GDP, Stability shows internal stability, Intelligence shows your intel coverage. Start a game to see the effects.">
            <span className="info-icon">ⓘ</span>
          </div>
          {(['political', 'military', 'economic', 'stability', 'intelligence'] as const).map(
            (layer) => (
              <button
                key={layer}
                className={`layer-btn ${mapLayer === layer ? 'active' : ''}`}
                onClick={() => useGameStore.getState().setMapLayer(layer)}
              >
                {layer.charAt(0).toUpperCase() + layer.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Dynamic Legend */}
      <div className="map-legend">
        <div className="legend-title">
          {mapLayer.charAt(0).toUpperCase() + mapLayer.slice(1)} Layer
        </div>
        {mapLayer === 'political' && (
          <div className="legend-items">
            <div className="legend-item"><span className="legend-color" style={{background: '#4CAF50'}}></span> Democracy</div>
            <div className="legend-item"><span className="legend-color" style={{background: '#F44336'}}></span> Autocracy</div>
            <div className="legend-item"><span className="legend-color" style={{background: '#E91E63'}}></span> Communist</div>
            <div className="legend-item"><span className="legend-color" style={{background: '#9C27B0'}}></span> Monarchy</div>
            <div className="legend-item"><span className="legend-color" style={{background: '#FF9800'}}></span> Theocracy</div>
            <div className="legend-divider"></div>
            <div className="legend-item"><span className="legend-border" style={{borderColor: '#FFD700'}}></span> Your Nation</div>
            <div className="legend-item"><span className="legend-border" style={{borderColor: '#FFFFFF'}}></span> Selected</div>
          </div>
        )}
        {mapLayer === 'military' && (
          <div className="legend-items">
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(0, 20%, 45%)'}}></span> &lt; 100K troops</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(0, 40%, 50%)'}}></span> 100K - 500K</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(0, 70%, 55%)'}}></span> 500K - 1M</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(0, 100%, 60%)'}}></span> &gt; 1M troops</div>
            <div className="legend-note">Circle size = army strength</div>
          </div>
        )}
        {mapLayer === 'economic' && (
          <div className="legend-items">
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(120, 20%, 35%)'}}></span> &lt; $1T GDP</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(120, 50%, 40%)'}}></span> $1T - $5T</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(120, 75%, 45%)'}}></span> $5T - $15T</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(120, 100%, 50%)'}}></span> &gt; $15T GDP</div>
            <div className="legend-note">Circle size = GDP</div>
          </div>
        )}
        {mapLayer === 'stability' && (
          <div className="legend-items">
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(0, 70%, 45%)'}}></span> 0-24% Critical</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(30, 70%, 45%)'}}></span> 25-49% Unstable</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(60, 70%, 45%)'}}></span> 50-74% Moderate</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'hsl(120, 70%, 45%)'}}></span> 75-100% Stable</div>
          </div>
        )}
        {mapLayer === 'intelligence' && (
          <div className="legend-items">
            <div className="legend-item"><span className="legend-color" style={{background: '#2196F3'}}></span> Your Nation</div>
            <div className="legend-item"><span className="legend-color" style={{background: 'rgba(100,100,100,0.6)'}}></span> Other Nations</div>
            <div className="legend-note">Opacity = intel coverage</div>
          </div>
        )}
      </div>

      {debugMode && worldState && (
        <div className="debug-overlay">
          <h4>Debug Info</h4>
          <pre>
            {JSON.stringify(
              {
                turn: worldState.turn,
                date: worldState.date,
                countries: worldState.countries.length,
                wars: worldState.wars.length,
                tension: worldState.globalTension,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
