import { useGameStore, type War } from '../store/gameStore';
import './WarProgressBar.css';

function formatCasualties(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return Math.round(num).toString();
}

interface WarProgressBarProps {
  war: War;
  attackerName: string;
  defenderName: string;
  playerCountryId: string;
}

export function WarProgressBar({ war, attackerName, defenderName, playerCountryId }: WarProgressBarProps) {
  const isPlayerAttacker = war.attackerId === playerCountryId;
  const isPlayerDefender = war.defenderId === playerCountryId;
  const playerSide = isPlayerAttacker ? 'attacker' : isPlayerDefender ? 'defender' : null;

  // frontline: 0-100, >50 means the attacker is advancing
  const attackerPercent = Math.max(0, Math.min(100, war.frontline));
  const defenderPercent = 100 - attackerPercent;

  const exhaustion = Math.max(0, Math.min(100, war.exhaustion));
  const exhaustionColor = exhaustion > 66 ? '#ff4040' : exhaustion > 33 ? '#e8b932' : '#3fbf6f';

  return (
    <div className={`war-progress-bar ${playerSide ? 'player-involved' : ''}`}>
      <div className="war-header">
        <span className={`combatant attacker ${isPlayerAttacker ? 'player' : ''}`}>
          {attackerName}
        </span>
        <span className="vs">⚔️</span>
        <span className={`combatant defender ${isPlayerDefender ? 'player' : ''}`}>
          {defenderName}
        </span>
      </div>

      <div className="progress-track">
        <div className="progress-fill attacker" style={{ width: `${attackerPercent}%` }}>
          {attackerPercent > 15 && <span>{attackerPercent.toFixed(0)}%</span>}
        </div>
        <div className="progress-fill defender" style={{ width: `${defenderPercent}%` }}>
          {defenderPercent > 15 && <span>{defenderPercent.toFixed(0)}%</span>}
        </div>
        <div className="progress-center-marker" />
      </div>

      <div className="war-stats">
        <div className="stat attacker">
          <span className="stat-label">Casualties</span>
          <span className="stat-value">{formatCasualties(war.attackerCasualties)}</span>
        </div>
        <div
          className="stat"
          style={{ alignItems: 'center' }}
          title={`War fatigue: ${exhaustion.toFixed(0)}%`}
        >
          <span className="stat-label">War Fatigue</span>
          <span className="stat-value" style={{ color: exhaustionColor }}>
            {exhaustion.toFixed(0)}%
          </span>
        </div>
        <div className="stat defender">
          <span className="stat-label">Casualties</span>
          <span className="stat-value">{formatCasualties(war.defenderCasualties)}</span>
        </div>
      </div>

      {playerSide && (
        <div
          className={`war-status ${
            attackerPercent > 55
              ? isPlayerAttacker
                ? 'winning'
                : 'losing'
              : attackerPercent < 45
                ? isPlayerAttacker
                  ? 'losing'
                  : 'winning'
                : 'stalemate'
          }`}
        >
          {playerSide === 'attacker'
            ? attackerPercent > 55
              ? 'Advancing'
              : attackerPercent < 45
                ? 'Retreating'
                : 'Stalemate'
            : defenderPercent > 55
              ? 'Holding'
              : defenderPercent < 45
                ? 'Falling Back'
                : 'Stalemate'}
        </div>
      )}
    </div>
  );
}

export function WarList() {
  const worldState = useGameStore((s) => s.worldState);

  if (!worldState) return null;

  const { wars, countries, playerCountryId } = worldState;
  const getCountryName = (id: string) => countries.find((c) => c.id === id)?.name ?? id;

  if (wars.length === 0) {
    return (
      <div className="war-progress-list empty">
        <p>No active wars — for now.</p>
      </div>
    );
  }

  const playerWars = wars.filter(
    (w) => w.attackerId === playerCountryId || w.defenderId === playerCountryId,
  );
  const otherWars = wars.filter(
    (w) => w.attackerId !== playerCountryId && w.defenderId !== playerCountryId,
  );

  return (
    <div className="war-progress-list">
      {playerWars.length > 0 && (
        <div className="war-section">
          <h4>Your Conflicts</h4>
          {playerWars.map((war) => (
            <WarProgressBar
              key={war.id}
              war={war}
              attackerName={getCountryName(war.attackerId)}
              defenderName={getCountryName(war.defenderId)}
              playerCountryId={playerCountryId}
            />
          ))}
        </div>
      )}

      {otherWars.length > 0 && (
        <div className="war-section">
          <h4>Global Conflicts</h4>
          {otherWars.map((war) => (
            <WarProgressBar
              key={war.id}
              war={war}
              attackerName={getCountryName(war.attackerId)}
              defenderName={getCountryName(war.defenderId)}
              playerCountryId={playerCountryId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
