import type { CSSProperties } from 'react';
import { useGameStore } from '../store/gameStore';
import './TurnFeedbackModal.css';

function formatActionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TurnFeedbackModal() {
  const { activeModal, lastTurnFeedback, closeModal, worldState } = useGameStore();

  if (activeModal !== 'turnFeedback' || !lastTurnFeedback) return null;

  const countryName = (id?: string) =>
    id ? (worldState?.countries.find((c) => c.id === id)?.name ?? id) : null;

  const { resolved, rejected, governmentChanges } = lastTurnFeedback;
  const isEmpty = resolved.length === 0 && rejected.length === 0 && governmentChanges.length === 0;

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    fontSize: 13,
    color: '#ddd',
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="turn-feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-header">
          <h2>Action Report</h2>
          <p>Outcome of your orders this month</p>
        </div>

        <div className="feedback-content" style={{ gap: 8 }}>
          {resolved.map((item, i) => (
            <div key={`r${i}`} style={rowStyle}>
              <span style={{ color: '#3fbf6f', fontWeight: 700 }}>✓</span>
              <span>
                {formatActionType(item.type)}
                {countryName(item.targetCountryId) ? ` — ${countryName(item.targetCountryId)}` : ''}
              </span>
            </div>
          ))}

          {rejected.map((item, i) => (
            <div key={`x${i}`} style={rowStyle}>
              <span style={{ color: '#ff4040', fontWeight: 700 }}>✕</span>
              <span>
                {formatActionType(item.action.type)}
                {countryName(item.action.targetCountryId)
                  ? ` — ${countryName(item.action.targetCountryId)}`
                  : ''}
                <span style={{ display: 'block', color: '#ff8080', fontSize: 12 }}>
                  {item.reason}
                </span>
              </span>
            </div>
          ))}

          {governmentChanges.map((change, i) => (
            <div key={`g${i}`} style={rowStyle}>
              <span>🏛</span>
              <span>
                <strong>{countryName(change.countryId)}</strong>
                <span style={{ display: 'block', color: '#aab', fontSize: 12 }}>
                  {change.description}
                </span>
              </span>
            </div>
          ))}

          {isEmpty && (
            <div className="feedback-empty">
              <p>A quiet month — no actions to report.</p>
            </div>
          )}
        </div>

        <div className="feedback-actions">
          <button className="btn-continue" onClick={closeModal}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
