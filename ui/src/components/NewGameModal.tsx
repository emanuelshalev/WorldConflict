import { useState } from 'react';
import { useGameStore, createNewGame } from '../store/gameStore';

const SCENARIOS = [
  { id: '2025', name: '2025 - Modern Era', description: 'Current geopolitical situation' },
  { id: '1990', name: '1990 - Post Cold War', description: 'Fall of the Soviet Union' },
  { id: '1960', name: '1960 - Cold War', description: 'Height of US-Soviet tensions' },
];

const COUNTRIES = [
  { id: 'USA', name: 'United States', flag: '🇺🇸' },
  { id: 'CHN', name: 'China', flag: '🇨🇳' },
  { id: 'RUS', name: 'Russia', flag: '🇷🇺' },
  { id: 'DEU', name: 'Germany', flag: '🇩🇪' },
  { id: 'GBR', name: 'United Kingdom', flag: '🇬🇧' },
  { id: 'FRA', name: 'France', flag: '🇫🇷' },
  { id: 'JPN', name: 'Japan', flag: '🇯🇵' },
  { id: 'IND', name: 'India', flag: '🇮🇳' },
  { id: 'BRA', name: 'Brazil', flag: '🇧🇷' },
  { id: 'KOR', name: 'South Korea', flag: '🇰🇷' },
  { id: 'CAN', name: 'Canada', flag: '🇨🇦' },
  { id: 'AUS', name: 'Australia', flag: '🇦🇺' },
  { id: 'ITA', name: 'Italy', flag: '🇮🇹' },
  { id: 'MEX', name: 'Mexico', flag: '🇲🇽' },
  { id: 'TUR', name: 'Turkey', flag: '🇹🇷' },
  { id: 'SAU', name: 'Saudi Arabia', flag: '🇸🇦' },
  { id: 'IRN', name: 'Iran', flag: '🇮🇷' },
  { id: 'ISR', name: 'Israel', flag: '🇮🇱' },
  { id: 'EGY', name: 'Egypt', flag: '🇪🇬' },
  { id: 'PAK', name: 'Pakistan', flag: '🇵🇰' },
  { id: 'IDN', name: 'Indonesia', flag: '🇮🇩' },
  { id: 'POL', name: 'Poland', flag: '🇵🇱' },
  { id: 'NGA', name: 'Nigeria', flag: '🇳🇬' },
  { id: 'ZAF', name: 'South Africa', flag: '🇿🇦' },
  { id: 'PRK', name: 'North Korea', flag: '🇰🇵' },
];

export function NewGameModal() {
  const { activeModal, closeModal, isLoading, error } = useGameStore();
  const [scenario, setScenario] = useState('2025');
  const [country, setCountry] = useState('USA');
  const [saveName, setSaveName] = useState('');

  if (activeModal !== 'newGame') return null;

  const handleStart = async () => {
    await createNewGame(scenario, country, saveName || undefined);
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Game</h2>
          <button className="modal-close" onClick={closeModal}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Save Name (optional)</label>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="My Game"
            />
          </div>

          <div className="form-group">
            <label>Scenario</label>
            <div className="scenario-list">
              {SCENARIOS.map((s) => (
                <div
                  key={s.id}
                  className={`scenario-option ${scenario === s.id ? 'selected' : ''}`}
                  onClick={() => setScenario(s.id)}
                >
                  <strong>{s.name}</strong>
                  <span>{s.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Play as</label>
            <div className="country-grid">
              {COUNTRIES.map((c) => (
                <div
                  key={c.id}
                  className={`country-option ${country === c.id ? 'selected' : ''}`}
                  onClick={() => setCountry(c.id)}
                >
                  <span className="flag">{c.flag}</span>
                  <span className="name">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoading ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
