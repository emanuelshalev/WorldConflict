import { executeTurn, fetchPreview, useGameStore, usePlayerCountry, PHASE_ORDER, PHASE_LABELS } from '../store/gameStore';
import type { TurnPhase } from '../store/gameStore';
import './ActionPanel.css';

interface ActionOption {
  id: string;
  label: string;
  icon: string;
  requiresTarget?: boolean;
  danger?: boolean;
  params?: Record<string, unknown>;
  value?: number;
}

const PHASE_ACTIONS: Partial<Record<TurnPhase, ActionOption[]>> = {
  diplomacy: [
    { id: 'DIPLOMACY_IMPROVE_RELATIONS', label: 'Improve Relations', icon: '🤝', requiresTarget: true },
    { id: 'DIPLOMACY_DENOUNCE', label: 'Denounce', icon: '📢', requiresTarget: true },
    { id: 'DIPLOMACY_PROPOSE_ALLIANCE', label: 'Propose Military Pact', icon: '🛡', requiresTarget: true },
    { id: 'DIPLOMACY_BREAK_ALLIANCE', label: 'Break Alliance', icon: '💔', requiresTarget: true, danger: true },
    { id: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: 'Propose Ceasefire', icon: '🕊', requiresTarget: true },
    { id: 'DIPLOMACY_DECLARE_WAR', label: 'Declare War', icon: '⚔️', requiresTarget: true, danger: true },
  ],
  military: [
    { id: 'MILITARY_MOBILIZE', label: 'Mobilize Forces', icon: '📯' },
    { id: 'MILITARY_DEMOBILIZE', label: 'Demobilize', icon: '🏠' },
    { id: 'MILITARY_PROCURE', label: 'Procure Arms ($500M)', icon: '🛒', value: 500 },
    { id: 'MILITARY_DEPLOY_BORDER', label: 'Deploy to Border', icon: '🪖', requiresTarget: true, danger: true },
    { id: 'MILITARY_WITHDRAW_BORDER', label: 'Withdraw from Border', icon: '↩️', requiresTarget: true },
    { id: 'MILITARY_AIRSTRIKE', label: 'Airstrike: Military', icon: '✈️', requiresTarget: true, danger: true, params: { targetType: 'MILITARY' } },
    { id: 'MILITARY_AIRSTRIKE', label: 'Airstrike: Nuclear Sites', icon: '☢', requiresTarget: true, danger: true, params: { targetType: 'NUCLEAR' } },
    { id: 'NUCLEAR_FUND_PROGRAM', label: 'Fund Nuclear Program ($20M/mo)', icon: '⚛️', danger: true },
    { id: 'NUCLEAR_STRIKE', label: 'NUCLEAR STRIKE', icon: '☢️', requiresTarget: true, danger: true },
  ],
  domestic: [
    { id: 'DOMESTIC_REFORM', label: 'Structural Reform', icon: '🏗' },
    { id: 'DOMESTIC_PROPAGANDA', label: 'State Propaganda', icon: '📺' },
    { id: 'DOMESTIC_POLICING', label: 'Soft Policing', icon: '👮', params: { tactic: 'SOFT' } },
    { id: 'DOMESTIC_POLICING', label: 'Hard Crackdown', icon: '🔨', danger: true, params: { tactic: 'HARD' } },
    { id: 'ECONOMY_ADJUST_MILITARY_BUDGET', label: 'Raise Military Budget', icon: '📈', value: -1 },
    { id: 'INTEL_GATHER', label: 'Intel Operation', icon: '🕵', requiresTarget: true },
    { id: 'INTEL_COUNTER_INTEL', label: 'Counter-Intelligence', icon: '🛡' },
  ],
};

export function ActionPanel() {
  const currentPhase = useGameStore((s) => s.currentPhase);
  const setPhase = useGameStore((s) => s.setPhase);
  const advancePhase = useGameStore((s) => s.advancePhase);
  const pendingActions = useGameStore((s) => s.pendingActions);
  const removePendingAction = useGameStore((s) => s.removePendingAction);
  const addPendingAction = useGameStore((s) => s.addPendingAction);
  const openModal = useGameStore((s) => s.openModal);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const setError = useGameStore((s) => s.setError);
  const gameOver = useGameStore((s) => s.gameOver);
  const pendingDecisions = useGameStore((s) => s.pendingDecisions);
  const decisionChoices = useGameStore((s) => s.decisionChoices);
  const worldState = useGameStore((s) => s.worldState);
  const player = usePlayerCountry();

  if (!worldState || !player) {
    return (
      <div className="action-panel">
        <p className="empty-text">Start a new game to take command.</p>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="action-panel">
        <h3 style={{ color: '#ff8080' }}>Your rule has ended</h3>
        <p style={{ fontSize: 13, color: '#bba' }}>{gameOver.description}</p>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => openModal('endGame')}>
          📜 View your place in history
        </button>
      </div>
    );
  }

  const handleAction = async (opt: ActionOption) => {
    if (opt.requiresTarget && !selectedCountryId) {
      setError('Select a target country on the map first');
      return;
    }
    if (opt.requiresTarget && selectedCountryId === player.id) {
      setError('Select a foreign country as the target');
      return;
    }
    const action = {
      type: opt.id,
      targetCountryId: opt.requiresTarget ? (selectedCountryId ?? undefined) : undefined,
      value: opt.value === -1 ? Math.min(20, player.militaryBudgetPercent + 1) : opt.value,
      params: opt.params,
    };
    const preview = await fetchPreview(action);
    addPendingAction({
      ...action,
      label: opt.requiresTarget ? `${opt.label} → ${selectedCountryId}` : opt.label,
      preview: preview ?? undefined,
    });
    openModal('actionPreview');
  };

  const phaseIndex = PHASE_ORDER.indexOf(currentPhase);
  const actions = PHASE_ACTIONS[currentPhase] ?? [];
  const unansweredCrises = pendingDecisions.filter((d) => !decisionChoices[d.id]).length;

  return (
    <div className="action-panel">
      {/* Phase stepper */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {PHASE_ORDER.map((phase, i) => (
          <button
            key={phase}
            onClick={() => i <= phaseIndex + 1 && setPhase(phase)}
            style={{
              flex: 1,
              padding: '5px 2px',
              fontSize: 10,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: phase === currentPhase ? '#2a6dd9' : i < phaseIndex ? '#1d3a5f' : '#1a1e28',
              color: phase === currentPhase ? '#fff' : i < phaseIndex ? '#7ab' : '#667',
              fontWeight: phase === currentPhase ? 700 : 400,
            }}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {/* Phase content */}
      {currentPhase === 'news' && (
        <div>
          <h3>📰 The World This Month</h3>
          <p style={{ fontSize: 13, color: '#aab' }}>Review the newspaper before making decisions.</p>
          <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 8 }} onClick={() => openModal('newspaper')}>
            Read the newspaper
          </button>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setPhase('briefing')}>
            Continue to briefing →
          </button>
        </div>
      )}

      {currentPhase === 'briefing' && (
        <div>
          <h3>📋 Morning Briefing — {worldState.date}</h3>
          <div style={{ fontSize: 13, color: '#bbc', marginBottom: 8 }}>
            <div>Approval: <b style={{ color: player.approval > 50 ? '#8c8' : '#e88' }}>{Math.round(player.approval)}%</b> · Stability: <b>{Math.round(player.stability)}%</b></div>
            <div>GDP: <b>${(player.gdp / 1e12).toFixed(2)}T</b> ({(player.growthRate * 100).toFixed(1)}%/yr) · Budget: <b>{player.militaryBudgetPercent.toFixed(1)}% GDP</b></div>
            {player.atWarWith.length > 0 && <div style={{ color: '#ff8080' }}>⚔️ At war with {player.atWarWith.join(', ')}</div>}
            {player.insurgencyLevel !== 'NONE' && <div style={{ color: '#e8a13c' }}>🔥 Insurgency: {player.insurgencyLevel} (policing: {player.policingTactic})</div>}
            {player.underGlobalEmbargo && <div style={{ color: '#ff8080' }}>🚫 Under global arms embargo</div>}
            {player.politicalSystem.nextElectionTurn !== null && (
              <div>🗳 Next election in {player.politicalSystem.nextElectionTurn - worldState.turn} months</div>
            )}
          </div>
          {unansweredCrises > 0 && (
            <div style={{ background: '#2a1518', border: '1px solid #a33', borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 13, color: '#ff9090' }}>
              ⚠ {unansweredCrises} crisis decision{unansweredCrises > 1 ? 's' : ''} await{unansweredCrises === 1 ? 's' : ''} your response
            </div>
          )}
          <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 8 }} onClick={() => openModal('advisor')}>
            💬 Consult your cabinet
          </button>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={advancePhase}>
            Begin diplomacy →
          </button>
        </div>
      )}

      {(currentPhase === 'diplomacy' || currentPhase === 'military' || currentPhase === 'domestic') && (
        <div>
          <h3>
            {currentPhase === 'diplomacy' ? '🤝 Diplomacy' : currentPhase === 'military' ? '🎖 Military' : '🏛 Domestic'}
          </h3>
          {currentPhase !== 'domestic' && (
            <p style={{ fontSize: 11, color: '#778', margin: '0 0 8px 0' }}>
              {selectedCountryId ? `Target: ${selectedCountryId}` : 'Select a country on the map to target it'}
            </p>
          )}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {actions.map((opt) => (
              <button
                key={opt.id + opt.label}
                onClick={() => handleAction(opt)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: '#1a1e28',
                  border: `1px solid ${opt.danger ? '#5a2a2a' : '#2a2e3a'}`,
                  color: opt.danger ? '#f99' : '#dde',
                  borderRadius: 6,
                  padding: '7px 10px',
                  marginBottom: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={advancePhase}>
            {currentPhase === 'domestic' ? 'Review & confirm →' : 'Next phase →'}
          </button>
        </div>
      )}

      {currentPhase === 'confirm' && (
        <div>
          <h3>✅ Confirm Orders — {worldState.date}</h3>
          {pendingActions.length === 0 && unansweredCrises === 0 && (
            <p style={{ fontSize: 13, color: '#888' }}>No actions queued. The month will pass; the world will not wait.</p>
          )}
          {pendingActions.map((a, i) => (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1e28', borderRadius: 6, padding: '6px 10px', marginBottom: 4, fontSize: 13 }}
            >
              <span>
                {a.label}
                {a.preview?.successChance != null && <span style={{ color: '#778' }}> ({a.preview.successChance}%)</span>}
              </span>
              <button onClick={() => removePendingAction(i)} style={{ background: 'none', border: 'none', color: '#a66', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          ))}
          {unansweredCrises > 0 && (
            <div style={{ fontSize: 12, color: '#e8a13c', margin: '6px 0' }}>
              ⚠ Unanswered crises will resolve themselves — usually badly.
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, background: '#b8762a' }}
            onClick={() => executeTurn()}
          >
            ⏵ Execute month — issue all orders
          </button>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: 6 }} onClick={() => setPhase('diplomacy')}>
            ← Back to planning
          </button>
        </div>
      )}
    </div>
  );
}
