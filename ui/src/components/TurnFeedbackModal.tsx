import { useGameStore } from '../store/gameStore';
import './TurnFeedbackModal.css';

export function TurnFeedbackModal() {
  const { activeModal, lastTurnFeedback, closeModal, advancePhase } = useGameStore();

  if (activeModal !== 'turnFeedback' || !lastTurnFeedback) return null;

  const handleContinue = () => {
    closeModal();
    advancePhase();
  };

  return (
    <div className="modal-overlay" onClick={handleContinue}>
      <div className="turn-feedback-modal" onClick={e => e.stopPropagation()}>
        <div className="feedback-header">
          <h2>Turn Resolution</h2>
          <p>The following events occurred this month</p>
        </div>

        <div className="feedback-content">
          {lastTurnFeedback.map((item, index) => (
            <div key={index} className="feedback-item">
              <h3 className="feedback-headline">{item.headline}</h3>
              <ul className="feedback-effects">
                {item.effects.map((effect, i) => (
                  <li key={i}>{effect}</li>
                ))}
              </ul>
            </div>
          ))}

          {lastTurnFeedback.length === 0 && (
            <div className="feedback-empty">
              <p>A quiet month with no major developments.</p>
            </div>
          )}
        </div>

        <div className="feedback-actions">
          <button className="btn-continue" onClick={handleContinue}>
            Continue to Next Month →
          </button>
        </div>
      </div>
    </div>
  );
}
