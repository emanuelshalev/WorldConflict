import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGameStore } from '../store/gameStore';

const COUNTRY_COLORS: Record<string, string> = {
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

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  const { worldState, selectedCountryId, selectCountry, mapLayer, debugMode } = useGameStore();

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

    return () => {
      markers.current.forEach((m) => m.remove());
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    // Use real game data if available, otherwise show demo markers
    const countries = worldState?.countries ?? DEMO_COUNTRIES;
    const isDemo = !worldState;

    const playerCountry = worldState?.countries.find(
      (c) => c.id === worldState?.playerCountryId
    );

    for (const country of countries) {
      const center = COUNTRY_CENTERS[country.id];
      if (!center) continue;

      const isPlayer = !isDemo && country.id === worldState?.playerCountryId;
      const isSelected = country.id === selectedCountryId;
      const isAlly = playerCountry?.alliances.includes(country.id);
      const isAtWar = playerCountry?.atWarWith.includes(country.id);
      const relation = playerCountry?.relations[country.id] ?? 0;

      let markerColor = COUNTRY_COLORS[country.regimeType] || '#607D8B';

      if (mapLayer === 'military') {
        const strength = Math.min(100, (country.manpower / 1000000) * 50);
        markerColor = `hsl(0, ${strength}%, 50%)`;
      } else if (mapLayer === 'economic') {
        const gdpScale = Math.min(100, (country.gdp / 30e12) * 100);
        markerColor = `hsl(120, ${gdpScale}%, 40%)`;
      } else if (mapLayer === 'stability') {
        markerColor = `hsl(${country.stability * 1.2}, 70%, 50%)`;
      } else if (mapLayer === 'intelligence') {
        if (isPlayer) {
          markerColor = '#2196F3';
        } else {
          const opacity = playerCountry ? playerCountry.intelLevel / 100 : 0.5;
          markerColor = `rgba(100, 100, 100, ${opacity})`;
        }
      }

      const el = document.createElement('div');
      el.className = 'country-marker';
      el.style.cssText = `
        width: ${isPlayer ? 40 : 30}px;
        height: ${isPlayer ? 40 : 30}px;
        background-color: ${markerColor};
        border: 3px solid ${
          isPlayer ? '#FFD700' : isSelected ? '#FFF' : isAtWar ? '#F00' : isAlly ? '#0F0' : 'transparent'
        };
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${isPlayer ? 14 : 12}px;
        color: white;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: transform 0.2s;
      `;
      el.textContent = country.iso3;
      el.title = isDemo 
        ? `${country.name}\nStability: ${country.stability}%\n(Demo - Start a game to play)`
        : `${country.name}\nStability: ${country.stability}%\nRelation: ${relation}`;

      el.addEventListener('click', () => {
        selectCountry(country.id === selectedCountryId ? null : country.id);
      });

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(center)
        .addTo(map.current!);

      markers.current.push(marker);
    }
  }, [worldState, selectedCountryId, mapLayer, selectCountry]);

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
