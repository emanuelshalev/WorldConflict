import { useGameStore } from '../store/gameStore';

export function Header() {
  const { worldState, openModal, debugMode, toggleDebugMode } = useGameStore();

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">World Conflicts</h1>
        {worldState && (
          <span className="header-date">
            {worldState.date} | Turn {worldState.turn}
          </span>
        )}
      </div>

      <div className="header-center">
        {worldState && (
          <div className="header-stats">
            <span className="stat">
              Global Tension: <strong>{worldState.globalTension}%</strong>
            </span>
            <span className="stat">
              Playing as: <strong>{worldState.playerCountryId}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="header-right">
        {!worldState ? (
          <button className="btn btn-primary" onClick={() => openModal('newGame')}>
            New Game
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={() => openModal('saveLoad')}>
              Save/Load
            </button>
            <button className="btn btn-secondary" onClick={() => openModal('advisor')}>
              Advisors
            </button>
          </>
        )}
        <button
          className={`btn btn-icon ${debugMode ? 'active' : ''}`}
          onClick={toggleDebugMode}
          title="Toggle Debug Mode"
        >
          🔧
        </button>
      </div>
    </header>
  );
}
