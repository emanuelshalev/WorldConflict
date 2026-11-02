import { pcCost } from '../lib/actions';
import { useModalFocus } from '../lib/useModalFocus';
import { useGameStore } from '../store/gameStore';
import './ActionPreviewModal.css';

/**
 * Shows the predicted consequences of the most recently queued action,
 * straight from the simulation's preview engine. The player confirms with
 * full knowledge of effects, costs, success odds and risks. Dismissing it
 * (backdrop, Escape) keeps the order queued; only "Cancel order" removes it.
 */
export function ActionPreviewModal() {
  const { activeModal, pendingActions, closeModal, removePendingAction } = useGameStore();
  const open = activeModal === 'actionPreview';
  const ref = useModalFocus<HTMLDivElement>(open);

  if (!open) return null;

  const index = pendingActions.length - 1;
  const currentAction = pendingActions[index];
  if (!currentAction) return null;
  const preview = currentAction.preview;
  const pc = pcCost(currentAction.type);

  const handleConfirm = () => closeModal();
  const handleCancel = () => {
    removePendingAction(index);
    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={preview?.blocked ? handleCancel : handleConfirm}>
      <div
        ref={ref}
        className="modal-content preview-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="preview-title">{currentAction.label}</h3>
        {preview ? (
          <>
            <p className="preview-summary">{preview.summary}</p>
            {preview.missionWarning && (
              <div role="alert" className="preview-box war">
                ⚠ {preview.missionWarning}
              </div>
            )}

            {preview.blocked ? (
              <div className="preview-box war">⛔ {preview.blocked}</div>
            ) : (
              <>
                <div className="preview-costs">
                  <span>
                    Capital <b className="num">{pc > 0 ? `◆${pc}` : 'free'}</b>
                  </span>
                  {preview.costM > 0 && (
                    <span>
                      Budget{' '}
                      <b className={`num ${preview.affordable ? '' : 'delta-down'}`}>${preview.costM}M</b>
                      <span className="muted"> of ${preview.budgetM}M</span>
                    </span>
                  )}
                  {preview.successChance !== null && (
                    <span>
                      Success{' '}
                      <b
                        className={`num ${preview.successChance > 60 ? 'delta-up' : preview.successChance > 35 ? '' : 'delta-down'}`}
                      >
                        {preview.successChance}%
                      </b>
                    </span>
                  )}
                </div>

                {preview.effects.length > 0 && (
                  <div className="preview-effects">
                    <div className="preview-label">Predicted effects</div>
                    {preview.effects.map((e, i) => (
                      <div key={i} className="preview-effect">
                        <span>
                          {e.target} · {e.metric}
                          {e.note && <span className="muted">: {e.note}</span>}
                        </span>
                        <b className={`num ${e.delta.startsWith('-') ? 'delta-down' : e.delta.startsWith('+') ? 'delta-up' : ''}`}>
                          {e.delta}
                        </b>
                      </div>
                    ))}
                  </div>
                )}

                {preview.risks.length > 0 && (
                  <div className="preview-box warn">
                    {preview.risks.map((r, i) => (
                      <div key={i}>⚠ {r}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="muted">No forecast available for this order.</p>
        )}

        <div className="preview-actions">
          {preview?.blocked ? (
            <button className="wc-btn primary" onClick={handleCancel}>
              Understood
            </button>
          ) : (
            <>
              <button className="wc-btn ghost" onClick={handleCancel}>
                Cancel order
              </button>
              <button className="wc-btn primary" onClick={handleConfirm}>
                Keep order
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
