import { useGameStore, executeTurn } from '../store/gameStore';

export function Sidebar() {
  const { worldState, selectedCountryId, isLoading } = useGameStore();

  if (!worldState) {
    return (
      <aside className="sidebar">
        <div className="sidebar-empty">
          <p>Start a new game to begin</p>
        </div>
      </aside>
    );
  }

  const playerCountry = worldState.countries.find(
    (c) => c.id === worldState.playerCountryId
  );

  const selectedCountry = selectedCountryId
    ? worldState.countries.find((c) => c.id === selectedCountryId)
    : null;

  const handleEndTurn = () => {
    executeTurn([]);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>Your Country: {playerCountry?.name}</h3>
        {playerCountry && (
          <div className="country-stats">
            <div className="stat-row">
              <span>Stability</span>
              <div className="stat-bar">
                <div
                  className="stat-fill stability"
                  style={{ width: `${playerCountry.stability}%` }}
                />
              </div>
              <span>{playerCountry.stability}%</span>
            </div>
            <div className="stat-row">
              <span>Legitimacy</span>
              <div className="stat-bar">
                <div
                  className="stat-fill legitimacy"
                  style={{ width: `${playerCountry.legitimacy}%` }}
                />
              </div>
              <span>{playerCountry.legitimacy}%</span>
            </div>
            <div className="stat-row">
              <span>GDP</span>
              <span>${(playerCountry.gdp / 1e12).toFixed(2)}T</span>
            </div>
            <div className="stat-row">
              <span>Military</span>
              <span>{playerCountry.manpower.toLocaleString()} troops</span>
            </div>
            <div className="stat-row">
              <span>Mobilization</span>
              <span>{playerCountry.mobilizationLevel}%</span>
            </div>
            <div className="stat-row">
              <span>Allies</span>
              <span>{playerCountry.alliances.length}</span>
            </div>
            {playerCountry.atWarWith.length > 0 && (
              <div className="stat-row warning">
                <span>At War With</span>
                <span>{playerCountry.atWarWith.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCountry && selectedCountry.id !== worldState.playerCountryId && (
        <div className="sidebar-section">
          <h3>Selected: {selectedCountry.name}</h3>
          <div className="country-stats">
            <div className="stat-row">
              <span>Relations</span>
              <span
                className={
                  (playerCountry?.relations[selectedCountry.id] ?? 0) > 0
                    ? 'positive'
                    : (playerCountry?.relations[selectedCountry.id] ?? 0) < 0
                    ? 'negative'
                    : ''
                }
              >
                {playerCountry?.relations[selectedCountry.id] ?? 0}
              </span>
            </div>
            <div className="stat-row">
              <span>Regime</span>
              <span>{selectedCountry.regimeType}</span>
            </div>
            <div className="stat-row">
              <span>Stability</span>
              <span>{selectedCountry.stability}%</span>
            </div>
            <div className="stat-row">
              <span>Military</span>
              <span>{selectedCountry.manpower.toLocaleString()}</span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-small">Improve Relations</button>
            <button className="btn btn-small">Denounce</button>
            {playerCountry?.alliances.includes(selectedCountry.id) ? (
              <button className="btn btn-small btn-warning">Break Alliance</button>
            ) : (
              <button className="btn btn-small">Propose Alliance</button>
            )}
            {!playerCountry?.atWarWith.includes(selectedCountry.id) && (
              <button className="btn btn-small btn-danger">Declare War</button>
            )}
          </div>
        </div>
      )}

      <div className="sidebar-section sidebar-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={handleEndTurn}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'End Turn'}
        </button>
      </div>
    </aside>
  );
}
