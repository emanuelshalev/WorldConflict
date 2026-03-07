import { useGameStore } from '../store/gameStore';
import './ActionPreviewModal.css';

export function ActionPreviewModal() {
  const { activeModal, pendingActions, closeModal, removePendingAction } = useGameStore();

  if (activeModal !== 'actionPreview') return null;

  const currentAction = pendingActions[pendingActions.length - 1];
  if (!currentAction?.preview) return null;

  const { preview } = currentAction;

  const handleConfirm = () => {
    closeModal();
  };

  const handleCancel = () => {
    removePendingAction(pendingActions.length - 1);
    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="action-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <h2>Action Consequences Preview</h2>
          <p className="preview-action-type">{currentAction.type}</p>
        </div>

        <div className="preview-content">
          {preview.effects.length > 0 && (
            <section className="preview-section">
              <h3>📊 Expected Effects</h3>
              <div className="effects-list">
                {preview.effects.map((effect, i) => (
                  <div key={i} className={`effect-item ${effect.change > 0 ? 'positive' : 'negative'}`}>
                    <span className="effect-target">{effect.target}</span>
                    <span className="effect-type">{effect.type}</span>
                    <span className="effect-change">
                      {effect.change > 0 ? '+' : ''}{effect.change}
                    </span>
                    <span className="effect-desc">{effect.description}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {preview.costs.length > 0 && (
            <section className="preview-section">
              <h3>💰 Costs</h3>
              <div className="costs-list">
                {preview.costs.map((cost, i) => (
                  <div key={i} className="cost-item">
                    <span className="cost-type">{cost.type}</span>
                    <span className="cost-amount">-${(cost.amount / 1e6).toFixed(0)}M</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {preview.risks.length > 0 && (
            <section className="preview-section risks">
              <h3>⚠️ Risks</h3>
              <ul className="risks-list">
                {preview.risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="preview-actions">
          <button className="btn-cancel" onClick={handleCancel}>
            Cancel Action
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}
