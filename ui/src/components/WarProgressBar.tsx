import './WarProgressBar.css';

interface War {
  id: string;
  attackerId: string;
  defenderId: string;
  attackerProgress: number;
  defenderProgress: number;
  attackerName?: string;
  defenderName?: string;
  attackerCasualties?: number;
  defenderCasualties?: number;
}

interface WarProgressBarProps {
  war: War;
  playerCountryId: string;
}

export function WarProgressBar({ war, playerCountryId }: WarProgressBarProps) {
  const isPlayerAttacker = war.attackerId === playerCountryId;
  const isPlayerDefender = war.defenderId === playerCountryId;
  
  const totalProgress = war.attackerProgress + war.defenderProgress;
  const attackerPercent = totalProgress > 0 ? (war.attackerProgress / totalProgress) * 100 : 50;
  const defenderPercent = 100 - attackerPercent;

  const playerSide = isPlayerAttacker ? 'attacker' : isPlayerDefender ? 'defender' : null;

  return (
    <div className={`war-progress-bar ${playerSide ? 'player-involved' : ''}`}>
      <div className="war-header">
        <span className={`combatant attacker ${isPlayerAttacker ? 'player' : ''}`}>
          {war.attackerName || war.attackerId}
        </span>
        <span className="vs">⚔️</span>
        <span className={`combatant defender ${isPlayerDefender ? 'player' : ''}`}>
          {war.defenderName || war.defenderId}
        </span>
      </div>

      <div className="progress-track">
        <div 
          className="progress-fill attacker" 
          style={{ width: `${attackerPercent}%` }}
        >
          {attackerPercent > 15 && <span>{attackerPercent.toFixed(0)}%</span>}
        </div>
        <div 
          className="progress-fill defender" 
          style={{ width: `${defenderPercent}%` }}
        >
          {defenderPercent > 15 && <span>{defenderPercent.toFixed(0)}%</span>}
        </div>
        <div className="progress-center-marker" />
      </div>

      <div className="war-stats">
        <div className="stat attacker">
          <span className="stat-label">Casualties</span>
          <span className="stat-value">
            {formatCasualties(war.attackerCasualties || 0)}
          </span>
        </div>
        <div className="stat defender">
          <span className="stat-label">Casualties</span>
          <span className="stat-value">
            {formatCasualties(war.defenderCasualties || 0)}
          </span>
        </div>
      </div>

      {playerSide && (
        <div className={`war-status ${attackerPercent > 55 ? 'winning' : attackerPercent < 45 ? 'losing' : 'stalemate'}`}>
          {playerSide === 'attacker' 
            ? (attackerPercent > 55 ? 'Advancing' : attackerPercent < 45 ? 'Retreating' : 'Stalemate')
            : (defenderPercent > 55 ? 'Holding' : defenderPercent < 45 ? 'Falling Back' : 'Stalemate')
          }
        </div>
      )}
    </div>
  );
}

function formatCasualties(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

interface WarProgressListProps {
  wars: War[];
  playerCountryId: string;
  countries: Array<{ id: string; name: string }>;
}

export function WarProgressList({ wars, playerCountryId, countries }: WarProgressListProps) {
  const getCountryName = (id: string) => countries.find(c => c.id === id)?.name || id;

  const enrichedWars = wars.map(war => ({
    ...war,
    attackerName: getCountryName(war.attackerId),
    defenderName: getCountryName(war.defenderId),
  }));

  const playerWars = enrichedWars.filter(
    w => w.attackerId === playerCountryId || w.defenderId === playerCountryId
  );
  const otherWars = enrichedWars.filter(
    w => w.attackerId !== playerCountryId && w.defenderId !== playerCountryId
  );

  if (wars.length === 0) {
    return (
      <div className="war-progress-list empty">
        <p>🕊️ No active conflicts</p>
      </div>
    );
  }

  return (
    <div className="war-progress-list">
      {playerWars.length > 0 && (
        <div className="war-section">
          <h4>Your Conflicts</h4>
          {playerWars.map(war => (
            <WarProgressBar 
              key={war.id} 
              war={war} 
              playerCountryId={playerCountryId} 
            />
          ))}
        </div>
      )}

      {otherWars.length > 0 && (
        <div className="war-section">
          <h4>Global Conflicts</h4>
          {otherWars.map(war => (
            <WarProgressBar 
              key={war.id} 
              war={war} 
              playerCountryId={playerCountryId} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
