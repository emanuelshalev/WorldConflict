import { useState } from 'react';
import { useGameStore, executeTurn } from '../store/gameStore';

type ActionTab = 'diplomacy' | 'military' | 'economy' | 'domestic';

interface PendingAction {
  type: string;
  targetCountryId?: string;
  value?: number;
}

export function ActionMenu() {
  const { worldState, selectedCountryId, isLoading } = useGameStore();
  const [activeTab, setActiveTab] = useState<ActionTab>('diplomacy');
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  if (!worldState) return null;

  const playerCountry = worldState.countries.find(
    (c) => c.id === worldState.playerCountryId
  );

  const selectedCountry = selectedCountryId
    ? worldState.countries.find((c) => c.id === selectedCountryId)
    : null;

  const addAction = (action: PendingAction) => {
    const exists = pendingActions.some(
      (a) => a.type === action.type && a.targetCountryId === action.targetCountryId
    );
    if (!exists && pendingActions.length < 3) {
      setPendingActions([...pendingActions, action]);
    }
  };

  const removeAction = (index: number) => {
    setPendingActions(pendingActions.filter((_, i) => i !== index));
  };

  const handleEndTurn = async () => {
    await executeTurn(pendingActions);
    setPendingActions([]);
  };

  const relation = selectedCountry && playerCountry
    ? playerCountry.relations[selectedCountry.id] ?? 0
    : 0;

  const isAlly = selectedCountry && playerCountry?.alliances.includes(selectedCountry.id);
  const isAtWar = selectedCountry && playerCountry?.atWarWith.includes(selectedCountry.id);

  return (
    <div className="action-menu">
      <div className="action-tabs">
        {(['diplomacy', 'military', 'economy', 'domestic'] as ActionTab[]).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="action-content">
        {activeTab === 'diplomacy' && (
          <div className="action-list">
            {selectedCountry && selectedCountry.id !== worldState.playerCountryId ? (
              <>
                <button
                  className="action-btn"
                  onClick={() => addAction({ type: 'DIPLOMACY_IMPROVE_RELATIONS', targetCountryId: selectedCountry.id })}
                >
                  <span className="action-icon">🤝</span>
                  <div className="action-info">
                    <strong>Improve Relations</strong>
                    <span>+5 relations with {selectedCountry.name}</span>
                  </div>
                </button>

                <button
                  className="action-btn"
                  onClick={() => addAction({ type: 'DIPLOMACY_DENOUNCE', targetCountryId: selectedCountry.id })}
                >
                  <span className="action-icon">📢</span>
                  <div className="action-info">
                    <strong>Denounce</strong>
                    <span>-10 relations, may rally allies</span>
                  </div>
                </button>

                {!isAlly && relation >= 50 && (
                  <button
                    className="action-btn"
                    onClick={() => addAction({ type: 'DIPLOMACY_PROPOSE_ALLIANCE', targetCountryId: selectedCountry.id })}
                  >
                    <span className="action-icon">🛡️</span>
                    <div className="action-info">
                      <strong>Propose Alliance</strong>
                      <span>Requires 50+ relations</span>
                    </div>
                  </button>
                )}

                {isAlly && (
                  <button
                    className="action-btn warning"
                    onClick={() => addAction({ type: 'DIPLOMACY_BREAK_ALLIANCE', targetCountryId: selectedCountry.id })}
                  >
                    <span className="action-icon">💔</span>
                    <div className="action-info">
                      <strong>Break Alliance</strong>
                      <span>Damages reputation</span>
                    </div>
                  </button>
                )}

                {!isAtWar && (
                  <button
                    className="action-btn danger"
                    onClick={() => addAction({ type: 'DIPLOMACY_DECLARE_WAR', targetCountryId: selectedCountry.id })}
                  >
                    <span className="action-icon">⚔️</span>
                    <div className="action-info">
                      <strong>Declare War</strong>
                      <span>Begin military conflict</span>
                    </div>
                  </button>
                )}

                {isAtWar && (
                  <button
                    className="action-btn"
                    onClick={() => addAction({ type: 'DIPLOMACY_PROPOSE_CEASEFIRE', targetCountryId: selectedCountry.id })}
                  >
                    <span className="action-icon">🕊️</span>
                    <div className="action-info">
                      <strong>Propose Ceasefire</strong>
                      <span>End hostilities</span>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <p className="action-hint">Select a country on the map to see diplomatic options</p>
            )}
          </div>
        )}

        {activeTab === 'military' && (
          <div className="action-list">
            {playerCountry && playerCountry.mobilizationLevel < 100 && (
              <button
                className="action-btn"
                onClick={() => addAction({ type: 'MILITARY_MOBILIZE' })}
              >
                <span className="action-icon">📯</span>
                <div className="action-info">
                  <strong>Mobilize</strong>
                  <span>+20% mobilization, -5 stability</span>
                </div>
              </button>
            )}

            {playerCountry && playerCountry.mobilizationLevel > 0 && (
              <button
                className="action-btn"
                onClick={() => addAction({ type: 'MILITARY_DEMOBILIZE' })}
              >
                <span className="action-icon">🏠</span>
                <div className="action-info">
                  <strong>Demobilize</strong>
                  <span>-20% mobilization, +3 stability</span>
                </div>
              </button>
            )}

            <div className="action-stat">
              <span>Current Mobilization:</span>
              <strong>{playerCountry?.mobilizationLevel ?? 0}%</strong>
            </div>
          </div>
        )}

        {activeTab === 'economy' && (
          <div className="action-list">
            <button
              className="action-btn"
              onClick={() => addAction({ type: 'ECONOMY_ADJUST_MILITARY_BUDGET', value: Math.min(15, (playerCountry?.militaryBudgetPercent ?? 3) + 1) })}
            >
              <span className="action-icon">📈</span>
              <div className="action-info">
                <strong>Increase Military Budget</strong>
                <span>+1% GDP to military</span>
              </div>
            </button>

            <button
              className="action-btn"
              onClick={() => addAction({ type: 'ECONOMY_ADJUST_MILITARY_BUDGET', value: Math.max(1, (playerCountry?.militaryBudgetPercent ?? 3) - 1) })}
            >
              <span className="action-icon">📉</span>
              <div className="action-info">
                <strong>Decrease Military Budget</strong>
                <span>-1% GDP from military</span>
              </div>
            </button>

            <div className="action-stat">
              <span>Military Budget:</span>
              <strong>{playerCountry?.militaryBudgetPercent ?? 0}% of GDP</strong>
            </div>
          </div>
        )}

        {activeTab === 'domestic' && (
          <div className="action-list">
            <button
              className="action-btn"
              onClick={() => addAction({ type: 'DOMESTIC_PROPAGANDA' })}
            >
              <span className="action-icon">📺</span>
              <div className="action-info">
                <strong>Propaganda Campaign</strong>
                <span>+5 legitimacy, +3 stability</span>
              </div>
            </button>

            <button
              className="action-btn"
              onClick={() => addAction({ type: 'DOMESTIC_REFORM' })}
            >
              <span className="action-icon">📜</span>
              <div className="action-info">
                <strong>Implement Reforms</strong>
                <span>+10 stability, costs legitimacy</span>
              </div>
            </button>

            <div className="action-stat">
              <span>Stability:</span>
              <strong>{playerCountry?.stability ?? 0}%</strong>
            </div>
            <div className="action-stat">
              <span>Legitimacy:</span>
              <strong>{playerCountry?.legitimacy ?? 0}%</strong>
            </div>
          </div>
        )}
      </div>

      {pendingActions.length > 0 && (
        <div className="pending-actions">
          <h4>Pending Actions ({pendingActions.length}/3)</h4>
          {pendingActions.map((action, i) => (
            <div key={i} className="pending-action">
              <span>{action.type.replace(/_/g, ' ')}</span>
              {action.targetCountryId && <span className="target">→ {action.targetCountryId}</span>}
              <button className="remove-btn" onClick={() => removeAction(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="action-footer">
        <button
          className="btn btn-primary btn-large"
          onClick={handleEndTurn}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : `End Turn${pendingActions.length > 0 ? ` (${pendingActions.length} actions)` : ''}`}
        </button>
      </div>
    </div>
  );
}
