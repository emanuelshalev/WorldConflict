import { useGameStore } from '../store/gameStore';
import './ActionPreviewModal.css';

/**
 * Shows the predicted consequences of the most recently queued action,
 * straight from the simulation's preview engine. The player confirms with
 * full knowledge of effects, costs, success odds and risks.
 */
export function ActionPreviewModal() {
  const { activeModal, pendingActions, closeModal, removePendingAction } = useGameStore();

  if (activeModal !== 'actionPreview') return null;

  const index = pendingActions.length - 1;
  const currentAction = pendingActions[index];
  if (!currentAction) return null;
  const preview = currentAction.preview;

  const handleConfirm = () => closeModal();
  const handleCancel = () => {
    removePendingAction(index);
    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div
        className="modal-content"
        style={{ maxWidth: 460, background: '#12151d', border: '1px solid #2a2e3a', borderRadius: 10, padding: 20, color: '#ddd' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 4px 0', color: '#fff' }}>{currentAction.label}</h3>
        {preview ? (
          <>
            <p style={{ color: '#aab', fontSize: 13, marginTop: 4 }}>{preview.summary}</p>

            {preview.blocked ? (
              <div style={{ background: '#2a1518', border: '1px solid #7a2a2a', borderRadius: 6, padding: 10, color: '#ff9090', fontSize: 13 }}>
                ⛔ {preview.blocked}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 16, margin: '10px 0', fontSize: 13 }}>
                  <span>
                    💵 Cost: <b style={{ color: preview.affordable ? '#9c9' : '#ff6060' }}>${preview.costM}M</b>
                    <span style={{ color: '#667' }}> / ${preview.budgetM}M budget</span>
                  </span>
                  {preview.successChance !== null && (
                    <span>
                      🎯 Success:{' '}
                      <b style={{ color: preview.successChance > 60 ? '#9c9' : preview.successChance > 35 ? '#e6a23c' : '#ff6060' }}>
                        {preview.successChance}%
                      </b>
                    </span>
                  )}
                </div>

                {preview.effects.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#778', marginBottom: 4 }}>
                      Predicted effects
                    </div>
                    {preview.effects.map((e, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #1c2029' }}>
                        <span>
                          {e.target} · {e.metric}
                          {e.note && <span style={{ color: '#667', fontSize: 11 }}> — {e.note}</span>}
                        </span>
                        <b style={{ color: e.delta.startsWith('-') ? '#ff8080' : e.delta.startsWith('+') ? '#8c8' : '#dda' }}>
                          {e.delta}
                        </b>
                      </div>
                    ))}
                  </div>
                )}

                {preview.risks.length > 0 && (
                  <div style={{ background: '#1f1a12', border: '1px solid #6a5424', borderRadius: 6, padding: 10, fontSize: 12 }}>
                    {preview.risks.map((r, i) => (
                      <div key={i} style={{ color: '#e8c06a', marginBottom: 3 }}>
                        ⚠ {r}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p style={{ color: '#888' }}>No forecast available for this action.</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{ background: '#1a1e28', border: '1px solid #2a2e3a', color: '#ccc', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
          >
            Cancel action
          </button>
          {!preview?.blocked && (
            <button
              onClick={handleConfirm}
              style={{ background: '#2a6dd9', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
            >
              Queue action
            </button>
          )}
          {preview?.blocked && (
            <button
              onClick={handleCancel}
              style={{ background: '#7a2a2a', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
            >
              Understood
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
