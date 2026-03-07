import { useState, useEffect } from 'react';
import { useGameStore, executeTurn } from '../store/gameStore';

interface AdvisorAlert {
  advisorId: string;
  advisorName: string;
  icon: string;
  urgency: 'critical' | 'warning' | 'info';
  message: string;
  suggestedAction?: {
    type: string;
    targetCountryId?: string;
    label: string;
  };
}

interface SuggestedAction {
  id: string;
  type: string;
  targetCountryId?: string;
  label: string;
  description: string;
  icon: string;
  risk: 'low' | 'medium' | 'high';
}

const ADVISORS = {
  FOREIGN_MINISTER: { name: 'Foreign Minister', icon: '🌍' },
  DEFENSE_MINISTER: { name: 'Defense Minister', icon: '🛡️' },
  FINANCE_MINISTER: { name: 'Finance Minister', icon: '💰' },
  INTELLIGENCE_CHIEF: { name: 'Intelligence Chief', icon: '🕵️' },
  DOMESTIC_ADVISOR: { name: 'Domestic Advisor', icon: '🏛️' },
};

export function TurnBriefingPanel() {
  const { worldState, openModal, setAdvisorRole, isLoading } = useGameStore();
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [customAction, setCustomAction] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [alerts, setAlerts] = useState<AdvisorAlert[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);

  const playerCountry = worldState?.countries.find(
    (c) => c.id === worldState?.playerCountryId
  );

  // Key values that should trigger re-generation of alerts
  const currentTurn = worldState?.turn ?? 0;
  const currentDate = worldState?.date ?? '';
  const playerStability = playerCountry?.stability ?? 0;
  const globalTension = worldState?.globalTension ?? 0;
  
  // Generate advisor alerts and suggested actions based on game state
  useEffect(() => {
    if (!worldState || !playerCountry) return;

    console.log('[TurnBriefingPanel] Regenerating alerts for turn:', currentTurn, 'date:', currentDate);
    console.log('[TurnBriefingPanel] Player stability:', playerStability, 'tension:', globalTension);

    const newAlerts: AdvisorAlert[] = [];
    const newSuggestions: SuggestedAction[] = [];
    
    // Always add a turn status briefing from Chief of Staff
    const turnStatus = worldState.turn === 1 
      ? 'Welcome to your first turn as leader. Review the situation and choose your actions wisely.'
      : `Turn ${worldState.turn} begins. The date is ${worldState.date}. Global tension stands at ${worldState.globalTension}%.`;
    
    newAlerts.push({
      advisorId: 'CHIEF_OF_STAFF',
      advisorName: 'Chief of Staff',
      icon: '⭐',
      urgency: 'info',
      message: turnStatus,
    });

    // Check for wars
    if (playerCountry.atWarWith.length > 0) {
      newAlerts.push({
        advisorId: 'DEFENSE_MINISTER',
        advisorName: ADVISORS.DEFENSE_MINISTER.name,
        icon: ADVISORS.DEFENSE_MINISTER.icon,
        urgency: 'critical',
        message: `We are at war with ${playerCountry.atWarWith.join(', ')}! Military action required.`,
        suggestedAction: {
          type: 'MILITARY_MOBILIZE',
          label: 'Mobilize Forces',
        },
      });

      if (playerCountry.mobilizationLevel < 50) {
        newSuggestions.push({
          id: 'mobilize',
          type: 'MILITARY_MOBILIZE',
          label: 'Mobilize Forces',
          description: 'Increase military readiness to fight the war',
          icon: '📯',
          risk: 'low',
        });
      }
    }

    // Check stability
    if (playerCountry.stability < 40) {
      newAlerts.push({
        advisorId: 'DOMESTIC_ADVISOR',
        advisorName: ADVISORS.DOMESTIC_ADVISOR.name,
        icon: ADVISORS.DOMESTIC_ADVISOR.icon,
        urgency: playerCountry.stability < 25 ? 'critical' : 'warning',
        message: `Stability is dangerously low at ${playerCountry.stability}%. Risk of government collapse!`,
        suggestedAction: {
          type: 'DOMESTIC_PROPAGANDA',
          label: 'Launch Propaganda Campaign',
        },
      });

      newSuggestions.push({
        id: 'propaganda',
        type: 'DOMESTIC_PROPAGANDA',
        label: 'Propaganda Campaign',
        description: 'Boost public support and stability',
        icon: '📺',
        risk: 'low',
      });
    }

    // Check for hostile neighbors
    const hostileCountries = Object.entries(playerCountry.relations)
      .filter(([_, rel]) => rel < -50)
      .map(([id]) => worldState.countries.find(c => c.id === id)?.name || id);

    if (hostileCountries.length > 0) {
      newAlerts.push({
        advisorId: 'INTELLIGENCE_CHIEF',
        advisorName: ADVISORS.INTELLIGENCE_CHIEF.name,
        icon: ADVISORS.INTELLIGENCE_CHIEF.icon,
        urgency: 'warning',
        message: `Hostile relations with: ${hostileCountries.join(', ')}. War may be imminent.`,
      });
    }

    // Check for alliance opportunities
    const potentialAllies = Object.entries(playerCountry.relations)
      .filter(([id, rel]) => rel >= 50 && !playerCountry.alliances.includes(id))
      .slice(0, 2);

    if (potentialAllies.length > 0) {
      const [allyId] = potentialAllies[0];
      const allyName = worldState.countries.find(c => c.id === allyId)?.name || allyId;
      
      newAlerts.push({
        advisorId: 'FOREIGN_MINISTER',
        advisorName: ADVISORS.FOREIGN_MINISTER.name,
        icon: ADVISORS.FOREIGN_MINISTER.icon,
        urgency: 'info',
        message: `${allyName} has favorable relations. Alliance opportunity available.`,
        suggestedAction: {
          type: 'DIPLOMACY_PROPOSE_ALLIANCE',
          targetCountryId: allyId,
          label: `Propose Alliance with ${allyName}`,
        },
      });

      newSuggestions.push({
        id: `ally-${allyId}`,
        type: 'DIPLOMACY_PROPOSE_ALLIANCE',
        targetCountryId: allyId,
        label: `Propose Alliance with ${allyName}`,
        description: 'Secure a military pact for mutual defense',
        icon: '🤝',
        risk: 'low',
      });
    }

    // Economic advice
    if (playerCountry.growthRate < 0) {
      newAlerts.push({
        advisorId: 'FINANCE_MINISTER',
        advisorName: ADVISORS.FINANCE_MINISTER.name,
        icon: ADVISORS.FINANCE_MINISTER.icon,
        urgency: 'warning',
        message: `Economy is contracting! Growth rate: ${(playerCountry.growthRate * 100).toFixed(1)}%`,
      });
    }

    // Global tension warning
    if (worldState.globalTension > 70) {
      newAlerts.push({
        advisorId: 'INTELLIGENCE_CHIEF',
        advisorName: ADVISORS.INTELLIGENCE_CHIEF.name,
        icon: ADVISORS.INTELLIGENCE_CHIEF.icon,
        urgency: 'warning',
        message: `Global tension is extremely high (${worldState.globalTension}%). World war risk elevated.`,
      });
    }

    // Add dynamic actions based on current state
    
    // Improve relations with a random country we're not allied with
    const nonAlliedCountries = worldState.countries
      .filter(c => c.id !== playerCountry.id && !playerCountry.alliances.includes(c.id) && !playerCountry.atWarWith.includes(c.id))
      .sort((a, b) => (playerCountry.relations[b.id] || 0) - (playerCountry.relations[a.id] || 0))
      .slice(0, 2);
    
    for (const country of nonAlliedCountries) {
      const relation = playerCountry.relations[country.id] || 0;
      if (relation < 60) {
        newSuggestions.push({
          id: `improve-${country.id}`,
          type: 'DIPLOMACY_IMPROVE_RELATIONS',
          targetCountryId: country.id,
          label: `Improve Relations with ${country.name}`,
          description: `Current relations: ${relation}. Send diplomats to improve ties.`,
          icon: '🕊️',
          risk: 'low',
        });
      }
    }

    // Domestic reform option (always available)
    newSuggestions.push({
      id: 'reform',
      type: 'DOMESTIC_REFORM',
      label: 'Implement Reforms',
      description: `Boost stability (${playerCountry.stability}%) and legitimacy`,
      icon: '📜',
      risk: 'low',
    });

    // Always add a "do nothing" option
    newSuggestions.push({
      id: 'wait',
      type: 'WAIT',
      label: 'Wait and Observe',
      description: 'Take no action this turn, monitor the situation',
      icon: '⏳',
      risk: 'low',
    });

    setAlerts(newAlerts);
    setSuggestedActions(newSuggestions);
  }, [worldState, playerCountry, currentTurn, currentDate, playerStability, globalTension]);

  const toggleAction = (actionId: string) => {
    setSelectedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : prev.length < 3 ? [...prev, actionId] : prev
    );
  };

  const handleEndTurn = async () => {
    const actions = selectedActions
      .map(id => suggestedActions.find(a => a.id === id))
      .filter(Boolean)
      .filter(a => a!.type !== 'WAIT')
      .map(a => ({
        type: a!.type,
        targetCountryId: a!.targetCountryId,
      }));

    await executeTurn(actions);
    setSelectedActions([]);
    setCustomAction('');
  };

  const handleCustomAction = async () => {
    if (!customAction.trim()) return;
    
    // For now, just end turn - in future this would be parsed by LLM
    // TODO: Implement natural language action parsing
    console.log('Custom action requested:', customAction);
    await executeTurn([]);
    setCustomAction('');
    setShowCustomInput(false);
  };

  if (!worldState || !playerCountry) return null;

  return (
    <div className="turn-briefing-panel">
      {/* Turn Header */}
      <div className="briefing-header">
        <div className="turn-info">
          <h2>Turn {worldState.turn}</h2>
          <span className="turn-date">{worldState.date}</span>
        </div>
        <div className="country-status">
          <span className="country-name">{playerCountry.name}</span>
          <div className="quick-stats">
            <span className={`stat ${playerCountry.stability < 40 ? 'warning' : ''}`}>
              📊 {playerCountry.stability}%
            </span>
            <span className="stat">💰 ${(playerCountry.gdp / 1e12).toFixed(1)}T</span>
            <span className="stat">⚔️ {(playerCountry.manpower / 1000).toFixed(0)}K</span>
          </div>
        </div>
      </div>

      {/* Advisor Alerts */}
      {alerts.length > 0 && (
        <div className="advisor-alerts">
          <h3>📢 Advisor Briefing</h3>
          {alerts.map((alert, i) => (
            <div 
              key={i} 
              className={`alert-card ${alert.urgency}`}
              onClick={() => {
                setAdvisorRole(alert.advisorId);
                openModal('advisor');
              }}
            >
              <div className="alert-header">
                <span className="advisor-icon">{alert.icon}</span>
                <span className="advisor-name">{alert.advisorName}</span>
                <span className={`urgency-badge ${alert.urgency}`}>
                  {alert.urgency === 'critical' ? '🚨' : alert.urgency === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
              </div>
              <p className="alert-message">{alert.message}</p>
              {alert.suggestedAction && (
                <button 
                  className="alert-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const actionId = suggestedActions.find(
                      a => a.type === alert.suggestedAction!.type && 
                           a.targetCountryId === alert.suggestedAction!.targetCountryId
                    )?.id;
                    if (actionId) toggleAction(actionId);
                  }}
                >
                  {alert.suggestedAction.label}
                </button>
              )}
            </div>
          ))}
          <button 
            className="consult-advisors-btn"
            onClick={() => openModal('advisor')}
          >
            💬 Consult Advisors for Details
          </button>
        </div>
      )}

      {/* Suggested Actions */}
      <div className="suggested-actions">
        <h3>📋 Recommended Actions</h3>
        <p className="action-hint">Select up to 3 actions for this turn:</p>
        
        <div className="action-grid">
          {suggestedActions.map((action) => (
            <div
              key={action.id}
              className={`action-card ${selectedActions.includes(action.id) ? 'selected' : ''} risk-${action.risk}`}
              onClick={() => toggleAction(action.id)}
            >
              <div className="action-header">
                <span className="action-icon">{action.icon}</span>
                <span className={`risk-indicator ${action.risk}`}>
                  {action.risk === 'high' ? '🔴' : action.risk === 'medium' ? '🟡' : '🟢'}
                </span>
              </div>
              <div className="action-label">{action.label}</div>
              <div className="action-desc">{action.description}</div>
              {selectedActions.includes(action.id) && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          ))}
        </div>

        {/* Custom Action Input */}
        <div className="custom-action-section">
          {!showCustomInput ? (
            <button 
              className="custom-action-toggle"
              onClick={() => setShowCustomInput(true)}
            >
              ✏️ Describe a custom action...
            </button>
          ) : (
            <div className="custom-action-input">
              <textarea
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                placeholder="Describe what you want to do in natural language... (e.g., 'Send a diplomatic envoy to improve relations with Germany' or 'Increase military spending to prepare for potential conflict')"
                rows={3}
              />
              <div className="custom-action-buttons">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomAction('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleCustomAction}
                  disabled={!customAction.trim()}
                >
                  Submit Action
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Actions Summary */}
      {selectedActions.length > 0 && (
        <div className="selected-actions-summary">
          <h4>Selected Actions ({selectedActions.length}/3):</h4>
          <ul>
            {selectedActions.map(id => {
              const action = suggestedActions.find(a => a.id === id);
              return action ? (
                <li key={id}>
                  {action.icon} {action.label}
                  <button onClick={() => toggleAction(id)}>×</button>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      )}

      {/* End Turn Button */}
      <div className="turn-actions">
        <button
          className="btn btn-primary btn-large end-turn-btn"
          onClick={handleEndTurn}
          disabled={isLoading || (selectedActions.length === 0 && !customAction.trim())}
        >
          {isLoading ? (
            <>⏳ Processing Turn...</>
          ) : selectedActions.length === 0 && !customAction.trim() ? (
            <>Select an action to continue</>
          ) : (
            <>
              End Turn {selectedActions.length > 0 && `(${selectedActions.length} actions)`}
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
