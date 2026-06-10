import { useGameStore, usePlayerCountry } from '../store/gameStore';

/**
 * Rise-to-power narrative shown once at the start of a new game.
 */
export function BackstoryModal() {
  const showBackstory = useGameStore((s) => s.showBackstory);
  const playerBackstory = useGameStore((s) => s.playerBackstory);
  const dismissBackstory = useGameStore((s) => s.dismissBackstory);
  const worldState = useGameStore((s) => s.worldState);
  const player = usePlayerCountry();

  if (!showBackstory || !player || !worldState) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}
    >
      <div style={{ width: 560, maxWidth: '92vw', textAlign: 'center', color: '#ddd', padding: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: '#887', marginBottom: 12 }}>
          {worldState.date} — {player.name.toUpperCase()}
        </div>
        <h1 style={{ fontSize: 26, color: '#fff', margin: '0 0 18px 0', fontWeight: 400 }}>
          You are {player.leader.name}, the new {player.politicalSystem.leaderTitle} of {player.name}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#bbc', fontStyle: 'italic' }}>
          {playerBackstory}
        </p>
        <div style={{ fontSize: 13, color: '#778', margin: '18px 0' }}>
          Approval {Math.round(player.approval)}% · Stability {Math.round(player.stability)}% ·{' '}
          {player.politicalSystem.type.replace(/_/g, ' ')}
        </div>
        <button
          onClick={dismissBackstory}
          style={{
            background: '#2a6dd9',
            border: 'none',
            color: '#fff',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 15,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Take office
        </button>
      </div>
    </div>
  );
}
