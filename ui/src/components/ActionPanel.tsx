import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import './ActionPanel.css';

interface ActionOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  requiresTarget?: boolean;
  category?: 'warning' | 'danger';
}

const DIPLOMACY_ACTIONS: ActionOption[] = [
  { id: 'DIPLOMACY_IMPROVE_RELATIONS', label: 'Improve Relations', description: 'Invest in diplomatic ties', icon: '🤝', requiresTarget: true },
  { id: 'DIPLOMACY_PROPOSE_ALLIANCE', label: 'Propose Alliance', description: 'Formal mutual defense pact', icon: '📜', requiresTarget: true },
  { id: 'DIPLOMACY_BREAK_ALLIANCE', label: 'Break Alliance', description: 'End existing alliance', icon: '💔', requiresTarget: true, category: 'warning' },
  { id: 'DIPLOMACY_DECLARE_WAR', label: 'Declare War', description: 'Military conflict', icon: '⚔️', requiresTarget: true, category: 'danger' },
  { id: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: 'Propose Ceasefire', description: 'End active conflict', icon: '🕊️', requiresTarget: true },
  { id: 'DIPLOMACY_CUSTOM', label: 'Custom Action...', description: 'Describe your diplomatic move', icon: '✏️' },
];

const MILITARY_ACTIONS: ActionOption[] = [
  { id: 'MILITARY_MOBILIZE', label: 'Mobilize Forces', description: 'Increase military readiness', icon: '🎖️' },
  { id: 'MILITARY_DEMOBILIZE', label: 'Demobilize', description: 'Reduce military spending', icon: '🏠' },
  { id: 'MILITARY_DEPLOY_BORDER', label: 'Deploy to Border', description: 'Position troops at border', icon: '🚧', requiresTarget: true, category: 'warning' },
  { id: 'MILITARY_AIRSTRIKE', label: 'Launch Airstrike', description: 'Precision strike on target', icon: '✈️', requiresTarget: true, category: 'danger' },
  { id: 'MILITARY_PURCHASE', label: 'Purchase Equipment', description: 'Buy military hardware', icon: '🛒' },
  { id: 'MILITARY_CUSTOM', label: 'Custom Action...', description: 'Describe your military move', icon: '✏️' },
];

const DOMESTIC_ACTIONS: ActionOption[] = [
  { id: 'DOMESTIC_ADJUST_BUDGET', label: 'Adjust Budget', description: 'Change military spending %', icon: '💰' },
  { id: 'DOMESTIC_ADDRESS_INSURGENCY', label: 'Address Insurgency', description: 'Deal with internal unrest', icon: '🛡️' },
  { id: 'DOMESTIC_ECONOMIC_POLICY', label: 'Economic Policy', description: 'Stimulus or austerity', icon: '📊' },
  { id: 'DOMESTIC_INTEL_OPERATION', label: 'Intel Operation', description: 'Covert activities', icon: '🕵️', requiresTarget: true },
  { id: 'DOMESTIC_CUSTOM', label: 'Custom Action...', description: 'Describe your domestic move', icon: '✏️' },
];

interface ActionGroupProps {
  title: string;
  icon: string;
  actions: ActionOption[];
  isExpanded: boolean;
  onToggle: () => void;
  pendingCount: number;
  onActionClick: (action: ActionOption) => void;
}

function ActionGroup({ title, icon, actions, isExpanded, onToggle, pendingCount, onActionClick }: ActionGroupProps) {
  return (
    <div className={`action-group ${isExpanded ? 'expanded' : ''}`}>
      <button className="action-group-header" onClick={onToggle}>
        <span className="group-icon">{icon}</span>
        <span className="group-title">{title}</span>
        {pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div className="action-group-content">
          {actions.map((action) => (
            <button
              key={action.id}
              className={`action-option ${action.category || ''}`}
              onClick={() => onActionClick(action)}
            >
              <span className="action-icon">{action.icon}</span>
              <div className="action-details">
                <span className="action-label">{action.label}</span>
                <span className="action-desc">{action.description}</span>
              </div>
              {action.requiresTarget && <span className="target-indicator">→</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionPanel() {
  const { worldState, pendingActions, addPendingAction, removePendingAction, openModal, selectedCountryId } = useGameStore();
  const [expandedGroup, setExpandedGroup] = useState<string | null>('diplomacy');

  if (!worldState) return null;

  const player = worldState.countries.find(c => c.id === worldState.playerCountryId);
  if (!player) return null;

  const handleActionClick = (action: ActionOption) => {
    if (action.id.endsWith('_CUSTOM')) {
      // TODO: Open custom action modal
      return;
    }

    if (action.requiresTarget && !selectedCountryId) {
      // Prompt to select a country on the map
      alert('Please select a target country on the map first.');
      return;
    }

    // Add to pending actions with preview
    const pendingAction = {
      type: action.id,
      targetCountryId: action.requiresTarget ? selectedCountryId ?? undefined : undefined,
      preview: {
        effects: [],
        risks: [],
        costs: [],
      },
    };

    addPendingAction(pendingAction);
    
    // Open preview modal
    openModal('actionPreview');
  };

  const handleConfirmTurn = async () => {
    if (pendingActions.length === 0) {
      alert('Please select at least one action before confirming your turn.');
      return;
    }

    // TODO: Submit turn to backend
    openModal('turnFeedback');
  };

  const diplomacyPending = pendingActions.filter(a => a.type.startsWith('DIPLOMACY_')).length;
  const militaryPending = pendingActions.filter(a => a.type.startsWith('MILITARY_')).length;
  const domesticPending = pendingActions.filter(a => a.type.startsWith('DOMESTIC_')).length;

  return (
    <div className="action-panel">
      <div className="action-panel-header">
        <h2>Actions</h2>
        <span className="turn-info">Turn {worldState.turn} - {worldState.date}</span>
      </div>

      <div className="action-groups">
        <ActionGroup
          title="Diplomacy"
          icon="🤝"
          actions={DIPLOMACY_ACTIONS}
          isExpanded={expandedGroup === 'diplomacy'}
          onToggle={() => setExpandedGroup(expandedGroup === 'diplomacy' ? null : 'diplomacy')}
          pendingCount={diplomacyPending}
          onActionClick={handleActionClick}
        />
        <ActionGroup
          title="Military"
          icon="⚔️"
          actions={MILITARY_ACTIONS}
          isExpanded={expandedGroup === 'military'}
          onToggle={() => setExpandedGroup(expandedGroup === 'military' ? null : 'military')}
          pendingCount={militaryPending}
          onActionClick={handleActionClick}
        />
        <ActionGroup
          title="Domestic"
          icon="🏛️"
          actions={DOMESTIC_ACTIONS}
          isExpanded={expandedGroup === 'domestic'}
          onToggle={() => setExpandedGroup(expandedGroup === 'domestic' ? null : 'domestic')}
          pendingCount={domesticPending}
          onActionClick={handleActionClick}
        />
      </div>

      {pendingActions.length > 0 && (
        <div className="pending-actions-section">
          <h3>Pending Actions ({pendingActions.length})</h3>
          <ul className="pending-list">
            {pendingActions.map((action, index) => (
              <li key={index} className="pending-item">
                <span className="pending-type">{action.type.replace(/_/g, ' ')}</span>
                {action.targetCountryId && (
                  <span className="pending-target">→ {action.targetCountryId}</span>
                )}
                <button 
                  className="remove-action" 
                  onClick={() => removePendingAction(index)}
                  title="Remove action"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="action-panel-footer">
        <button 
          className="btn btn-primary btn-large confirm-turn-btn"
          onClick={handleConfirmTurn}
          disabled={pendingActions.length === 0}
        >
          Confirm Turn ({pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
