import { useGameStore, usePlayerCountry } from '../store/gameStore';
import { flag, monthLabel, withArticle } from '../lib/format';
import { useModalFocus } from '../lib/useModalFocus';

/**
 * The cold open: who you are, how you got here, and what you must do.
 */
export function BackstoryModal() {
  const showBackstory = useGameStore((s) => s.showBackstory);
  const playerBackstory = useGameStore((s) => s.playerBackstory);
  const dismissBackstory = useGameStore((s) => s.dismissBackstory);
  const worldState = useGameStore((s) => s.worldState);
  const pending = useGameStore((s) => s.pendingDecisions);
  const player = usePlayerCountry();

  const ref = useModalFocus<HTMLDivElement>(!!(showBackstory && player && worldState));
  if (!showBackstory || !player || !worldState) return null;
  const objective = worldState.objective;
  const modeLabel =
    worldState.mode === 'FLASHPOINT' ? 'Flashpoint' : worldState.mode === 'TERM' ? 'One Term' : 'Legacy';

  return (
    <div ref={ref} className="overlay" style={{ alignItems: 'center', background: 'rgba(5,8,13,0.94)' }} role="dialog" aria-modal="true" aria-label="Briefing">
      <div style={{ width: 620, maxWidth: '100%', textAlign: 'center', padding: 8 }}>
        <div className="num" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'var(--text-3)' }}>
          {monthLabel(worldState.date).toUpperCase()} · {player.name.toUpperCase()} · {modeLabel.toUpperCase()}
        </div>
        <div style={{ fontSize: 56, margin: '10px 0 0' }}>{flag(player.id)}</div>
        <h1 className="display" style={{ fontSize: 'clamp(28px,5vw,40px)', margin: '6px 0 14px', lineHeight: 1.05 }}>
          {player.leader.name}, {player.leader.title || player.politicalSystem.leaderTitle} of {withArticle(player.name)}
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.65, color: 'var(--text-2)', fontStyle: 'italic' }}>
          {playerBackstory}
        </p>
        {objective && (
          <div
            style={{
              textAlign: 'left',
              border: '1px solid var(--line)',
              borderLeft: '3px solid var(--accent)',
              background: 'var(--surface-1)',
              borderRadius: 10,
              padding: '12px 14px',
              margin: '18px 0',
            }}
          >
            <div className="display" style={{ color: 'var(--accent)', letterSpacing: '0.16em', fontSize: 13 }}>
              Your mission · {worldState.maxTurns} months
            </div>
            <b style={{ fontSize: 17 }}>{objective.title}</b>
            <p style={{ margin: '4px 0 0', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>{objective.briefing}</p>
          </div>
        )}
        <div className="num" style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '12px 0 18px' }}>
          Approval {Math.round(player.approval)}% · Stability {Math.round(player.stability)}% ·{' '}
          {player.politicalSystem.type.replace(/_/g, ' ').toLowerCase()}
          {pending.length > 0 && <span style={{ color: 'var(--war)' }}> · a crisis is already on your desk</span>}
        </div>
        <button className="wc-btn primary big" onClick={dismissBackstory} autoFocus>
          Take office ▸
        </button>
      </div>
    </div>
  );
}
