import { useGameStore, usePlayerCountry } from '../store/gameStore';

function tensionColor(tension: number): string {
  if (tension >= 70) return '#ff4040';
  if (tension >= 40) return '#e8b932';
  return '#3fbf6f';
}

function scoreColor(total: number): string {
  if (total > 130) return '#3fbf6f';
  if (total > 90) return '#e8b932';
  return '#ff4040';
}

export function Header() {
  const { worldState, score, openModal } = useGameStore();
  const player = usePlayerCountry();

  if (!worldState) {
    return (
      <header className="header">
        <div className="header-left">
          <h1 className="header-title">WORLD CONFLICT</h1>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => openModal('settings')} title="Settings">
            ⚙
          </button>
          <button className="btn btn-primary" onClick={() => openModal('newGame')}>
            New Game
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">WORLD CONFLICT</h1>
        <span className="header-date">
          {worldState.date} | Turn {worldState.turn}
        </span>
      </div>

      <div className="header-center">
        <div className="header-stats">
          {player && (
            <span className="stat">
              <strong>
                {player.leader.title} {player.name}
              </strong>
            </span>
          )}
          <span className="stat">
            Global Tension:{' '}
            <strong style={{ color: tensionColor(worldState.globalTension) }}>
              {Math.round(worldState.globalTension)}%
            </strong>
          </span>
          {score && (
            <span
              className="stat"
              title={`Economic: ${Math.round(score.economic)} | Security: ${Math.round(score.security)} | Approval: ${Math.round(score.approval)} | Prestige: ${Math.round(score.prestige)}`}
              style={{
                background: '#1a1e28',
                border: `1px solid ${scoreColor(score.total)}`,
                borderRadius: 12,
                padding: '2px 10px',
                cursor: 'help',
              }}
            >
              Leadership:{' '}
              <strong style={{ color: scoreColor(score.total) }}>{Math.round(score.total)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-secondary" onClick={() => openModal('saveLoad')}>
          Save/Load
        </button>
        <button className="btn btn-secondary" onClick={() => openModal('advisor')}>
          Advisors
        </button>
        <button className="btn btn-secondary" onClick={() => openModal('settings')} title="Settings — plug in your LLM">
          ⚙
        </button>
        <button className="btn btn-primary" onClick={() => openModal('newGame')}>
          New Game
        </button>
      </div>
    </header>
  );
}
